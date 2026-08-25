import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@brnit/ui/components/avatar";
import { Button } from "@brnit/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@brnit/ui/components/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

const WHITESPACE_RUN = /\s+/;
const MAX_INITIALS = 2;

function initialsFor(name: string | null | undefined, email: string): string {
	const source = name?.trim() || email;
	const initials = source
		.split(WHITESPACE_RUN)
		.slice(0, MAX_INITIALS)
		.map((part) => part.charAt(0))
		.join("");
	return initials.toUpperCase() || "?";
}

export function UserMenu() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const user = session?.user;

	if (!user) {
		return null;
	}

	const handleSignOut = async () => {
		await authClient.signOut();
		// The query cache is per-session; a hard navigation is the cheapest way to
		// guarantee nothing from the old session survives into the next one.
		await navigate({ to: "/login", search: {}, reloadDocument: true });
		toast.success("Signed out");
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button className="rounded-full" size="icon-sm" variant="ghost" />
				}
			>
				<Avatar className="size-8">
					{user.image ? <AvatarImage alt="" src={user.image} /> : null}
					<AvatarFallback>{initialsFor(user.name, user.email)}</AvatarFallback>
				</Avatar>
				<span className="sr-only">Open account menu</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-56">
				<DropdownMenuLabel className="flex flex-col gap-0.5 text-foreground">
					<span className="truncate font-medium text-sm">
						{user.name || user.email}
					</span>
					<span className="truncate text-muted-foreground text-xs">
						{user.email}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut} variant="destructive">
					<LogOutIcon aria-hidden />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
