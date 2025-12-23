import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useLanguage, languageNames, SupportedLanguage } from "@/contexts/LanguageContext";

const LanguageSelector = () => {
    const { language, setLanguage } = useLanguage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Change Language">
                    <Globe className="w-5 h-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {(Object.entries(languageNames) as [SupportedLanguage, string][]).map(
                    ([code, name]) => (
                        <DropdownMenuItem
                            key={code}
                            onClick={() => setLanguage(code)}
                            className={language === code ? "bg-muted font-semibold" : ""}
                        >
                            <span className="w-6 text-center mr-2">
                                {code === "en" ? "🇬🇧" : code === "hi" ? "🇮🇳" : "🏠"}
                            </span>
                            {name}
                        </DropdownMenuItem>
                    )
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageSelector;
