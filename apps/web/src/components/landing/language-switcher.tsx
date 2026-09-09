import { Button } from "@brnit/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@brnit/ui/components/dropdown-menu";
import { CheckIcon, LanguagesIcon } from "lucide-react";

import { useI18n } from "@/lib/i18n/i18n-provider";
import { LOCALE_META, LOCALES } from "@/lib/i18n/locales";

/**
 * Language picker. Changing the locale rewrites `<html lang|dir>` through
 * `I18nProvider`, which flips the whole page between LTR and RTL — the labels
 * are always written in their own language, never translated.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
	const { copy, locale, setLocale } = useI18n();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={copy.footer.language}
						className={className}
						size="sm"
						variant="ghost"
					/>
				}
			>
				<LanguagesIcon aria-hidden className="size-4" />
				<span className="font-semibold text-xs">
					{LOCALE_META[locale].short}
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{LOCALES.map((option) => (
					<DropdownMenuItem key={option} onClick={() => setLocale(option)}>
						<span className="flex-1">{LOCALE_META[option].label}</span>
						{option === locale ? (
							<CheckIcon aria-hidden className="size-4 text-accent-fg" />
						) : null}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
