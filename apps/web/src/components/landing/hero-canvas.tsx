import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	Color,
	EdgesGeometry,
	Group,
	IcosahedronGeometry,
	LineBasicMaterial,
	LineSegments,
	NormalBlending,
	PerspectiveCamera,
	Points,
	Scene,
	ShaderMaterial,
	Vector2,
	WebGLRenderer,
} from "three";

import { prefersReducedMotion } from "@/hooks/use-scroll-motion";

/**
 * The hero's WebGL layer: a breathing sphere of ~2,400 points inside a slowly
 * counter-rotating lattice.
 *
 * It is deliberately a *background*, not a hero image — the CSS gradient behind
 * it carries the composition on its own, so a browser with no WebGL, a machine
 * that fails to compile the shader, or a visitor on `prefers-reduced-motion`
 * still gets a finished page. The module is code-split (see `landing-hero.tsx`),
 * which keeps `three` out of the first paint entirely.
 *
 * Scroll drives the scene rather than a separate animation: the sphere blooms
 * outward and the camera dollies back, so the 3D reads as one continuous
 * parallax layer with the DOM in front of it.
 */

const POINT_COUNT = 2400;
const SPHERE_RADIUS = 1.62;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const MAX_PIXEL_RATIO = 2;

const VERTEX_SHADER = `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uSpread;
uniform vec2 uPointer;
uniform vec3 uColorA;
uniform vec3 uColorB;

attribute float aSeed;
attribute float aScale;

varying vec3 vColor;
varying float vFade;

void main() {
	vec3 pos = position;

	float breathe =
		sin(uTime * 0.55 + aSeed * 6.2831) * 0.045 +
		sin(uTime * 0.31 + pos.y * 2.4) * 0.055;

	pos *= 1.0 + breathe + uSpread * aSeed * 0.45;
	pos.xy += uPointer * (0.10 + aSeed * 0.12);

	vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
	gl_Position = projectionMatrix * mvPosition;
	gl_PointSize = uSize * aScale * uPixelRatio * (2.6 / -mvPosition.z);

	vColor = mix(uColorA, uColorB, clamp(pos.y * 0.42 + 0.55, 0.0, 1.0));
	vFade = smoothstep(-7.0, -2.0, mvPosition.z) * 0.7 + 0.3;
}
`;

const FRAGMENT_SHADER = `
uniform float uOpacity;

varying vec3 vColor;
varying float vFade;

void main() {
	float distanceToCentre = length(gl_PointCoord - vec2(0.5));
	float mask = smoothstep(0.5, 0.06, distanceToCentre);

	if (mask < 0.01) {
		discard;
	}

	gl_FragColor = vec4(vColor, mask * vFade * uOpacity);
}
`;

interface Palette {
	colorA: string;
	colorB: string;
	latticeColor: string;
	latticeOpacity: number;
	opacity: number;
}

/**
 * Both palettes come straight from `@brnit/brand`: accent orange into the
 * decorative lilac. Dark mode adds additive blending, which is what turns the
 * points into a glow instead of a dusting of confetti.
 */
const PALETTES: Record<"dark" | "light", Palette> = {
	dark: {
		colorA: "#ff7a2e",
		colorB: "#b8a9f0",
		latticeColor: "#ff9a5c",
		latticeOpacity: 0.16,
		opacity: 0.95,
	},
	light: {
		colorA: "#fd6e20",
		colorB: "#c9befa",
		latticeColor: "#fd6e20",
		latticeOpacity: 0.12,
		opacity: 0.8,
	},
};

interface SceneHandles {
	lattice: LineBasicMaterial;
	points: ShaderMaterial;
}

function buildPointGeometry(): BufferGeometry {
	const positions = new Float32Array(POINT_COUNT * 3);
	const seeds = new Float32Array(POINT_COUNT);
	const scales = new Float32Array(POINT_COUNT);

	for (let index = 0; index < POINT_COUNT; index += 1) {
		const y = 1 - (index / (POINT_COUNT - 1)) * 2;
		const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
		const theta = GOLDEN_ANGLE * index;
		// A little jitter stops the fibonacci spiral from reading as a pattern.
		const jitter = 0.93 + Math.random() * 0.14;

		positions[index * 3] =
			Math.cos(theta) * ringRadius * SPHERE_RADIUS * jitter;
		positions[index * 3 + 1] = y * SPHERE_RADIUS * jitter;
		positions[index * 3 + 2] =
			Math.sin(theta) * ringRadius * SPHERE_RADIUS * jitter;
		seeds[index] = Math.random();
		scales[index] = 0.45 + Math.random() * 0.9;
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(positions, 3));
	geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
	geometry.setAttribute("aScale", new BufferAttribute(scales, 1));

	return geometry;
}

function applyPalette(handles: SceneHandles, theme: string | undefined) {
	const palette = theme === "dark" ? PALETTES.dark : PALETTES.light;

	handles.points.uniforms.uColorA?.value.set(palette.colorA);
	handles.points.uniforms.uColorB?.value.set(palette.colorB);

	if (handles.points.uniforms.uOpacity) {
		handles.points.uniforms.uOpacity.value = palette.opacity;
	}

	handles.points.blending =
		theme === "dark" ? AdditiveBlending : NormalBlending;
	handles.lattice.color.set(palette.latticeColor);
	handles.lattice.opacity = palette.latticeOpacity;
}

export function HeroCanvas({ className }: { className?: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const handlesRef = useRef<SceneHandles | null>(null);
	const { resolvedTheme } = useTheme();
	const themeRef = useRef(resolvedTheme);

	themeRef.current = resolvedTheme;

	useEffect(() => {
		const container = containerRef.current;

		if (!container) {
			return;
		}

		let renderer: WebGLRenderer;

		try {
			renderer = new WebGLRenderer({
				alpha: true,
				antialias: true,
				powerPreference: "high-performance",
			});
		} catch {
			// No WebGL (or a blocked context): the CSS gradient behind is the page.
			return;
		}

		const reduced = prefersReducedMotion();
		const scene = new Scene();
		const camera = new PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.z = 6.8;

		const group = new Group();
		group.rotation.x = 0.2;
		scene.add(group);

		const geometry = buildPointGeometry();
		const pointsMaterial = new ShaderMaterial({
			depthWrite: false,
			fragmentShader: FRAGMENT_SHADER,
			transparent: true,
			uniforms: {
				uColorA: { value: new Color(PALETTES.light.colorA) },
				uColorB: { value: new Color(PALETTES.light.colorB) },
				uOpacity: { value: PALETTES.light.opacity },
				uPixelRatio: { value: 1 },
				uPointer: { value: new Vector2() },
				uSize: { value: 13 },
				uSpread: { value: 0 },
				uTime: { value: 0 },
			},
			vertexShader: VERTEX_SHADER,
		});
		group.add(new Points(geometry, pointsMaterial));

		const latticeGeometry = new EdgesGeometry(
			new IcosahedronGeometry(SPHERE_RADIUS * 1.34, 1)
		);
		const latticeMaterial = new LineBasicMaterial({
			depthWrite: false,
			transparent: true,
		});
		const lattice = new LineSegments(latticeGeometry, latticeMaterial);
		group.add(lattice);

		const handles: SceneHandles = {
			lattice: latticeMaterial,
			points: pointsMaterial,
		};
		handlesRef.current = handles;
		applyPalette(handles, themeRef.current);

		renderer.domElement.style.width = "100%";
		renderer.domElement.style.height = "100%";
		renderer.domElement.style.display = "block";
		container.append(renderer.domElement);

		const resize = () => {
			const { clientHeight, clientWidth } = container;

			if (clientWidth === 0 || clientHeight === 0) {
				return;
			}

			const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
			renderer.setPixelRatio(pixelRatio);
			renderer.setSize(clientWidth, clientHeight, false);
			camera.aspect = clientWidth / clientHeight;
			camera.updateProjectionMatrix();

			if (pointsMaterial.uniforms.uPixelRatio) {
				pointsMaterial.uniforms.uPixelRatio.value = pixelRatio;
			}

			// A narrow phone viewport crops the sphere; pull back to keep it whole.
			camera.position.z = clientWidth < 640 ? 8.2 : 6.8;
		};

		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(container);
		resize();

		const pointer = new Vector2();
		const pointerTarget = new Vector2();
		let frameId = 0;
		let visible = true;
		let elapsed = 0;
		let lastFrame = performance.now();

		const renderFrame = () => {
			const scroll = Math.min(window.scrollY / window.innerHeight, 1.2);

			pointer.lerp(pointerTarget, 0.06);

			if (pointsMaterial.uniforms.uTime) {
				pointsMaterial.uniforms.uTime.value = elapsed;
			}

			if (pointsMaterial.uniforms.uSpread) {
				pointsMaterial.uniforms.uSpread.value = scroll * 0.55;
			}

			pointsMaterial.uniforms.uPointer?.value.copy(pointer);

			group.rotation.y += 0.0022 + scroll * 0.004;
			group.rotation.x = 0.2 + pointer.y * 0.28 + scroll * 0.22;
			lattice.rotation.y -= 0.0016;
			lattice.rotation.z += 0.0007;
			camera.position.z =
				(container.clientWidth < 640 ? 8.2 : 6.8) + scroll * 2.2;

			renderer.render(scene, camera);
		};

		const tick = (now: number) => {
			frameId = window.requestAnimationFrame(tick);
			elapsed += Math.min((now - lastFrame) / 1000, 0.05);
			lastFrame = now;
			renderFrame();
		};

		const start = () => {
			if (frameId === 0 && !reduced) {
				lastFrame = performance.now();
				frameId = window.requestAnimationFrame(tick);
			}
		};

		const stop = () => {
			if (frameId !== 0) {
				window.cancelAnimationFrame(frameId);
				frameId = 0;
			}
		};

		const handlePointerMove = (event: PointerEvent) => {
			pointerTarget.set(
				(event.clientX / window.innerWidth) * 2 - 1,
				-((event.clientY / window.innerHeight) * 2 - 1)
			);
		};

		const handleVisibility = () => {
			if (document.hidden) {
				stop();
			} else if (visible) {
				start();
			}
		};

		// Off-screen heroes cost nothing: the loop stops once it scrolls away.
		const intersectionObserver = new IntersectionObserver(([entry]) => {
			visible = entry?.isIntersecting ?? true;

			if (visible && !document.hidden) {
				start();
			} else {
				stop();
			}
		});
		intersectionObserver.observe(container);

		document.addEventListener("visibilitychange", handleVisibility);

		if (reduced) {
			// One frame, so the composition is there without any motion at all.
			renderFrame();
		} else {
			window.addEventListener("pointermove", handlePointerMove, {
				passive: true,
			});
			start();
		}

		return () => {
			stop();
			intersectionObserver.disconnect();
			resizeObserver.disconnect();
			document.removeEventListener("visibilitychange", handleVisibility);
			window.removeEventListener("pointermove", handlePointerMove);
			handlesRef.current = null;
			geometry.dispose();
			pointsMaterial.dispose();
			latticeGeometry.dispose();
			latticeMaterial.dispose();
			renderer.domElement.remove();
			renderer.dispose();
		};
	}, []);

	useEffect(() => {
		if (handlesRef.current) {
			applyPalette(handlesRef.current, resolvedTheme);
		}
	}, [resolvedTheme]);

	return <div aria-hidden className={className} ref={containerRef} />;
}
