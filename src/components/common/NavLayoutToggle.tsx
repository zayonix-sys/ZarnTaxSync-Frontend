import { LayoutPanelLeft, PanelTop } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePreferencesStore } from "@/stores/preferences";

export function NavLayoutToggle() {
  const navLayout = usePreferencesStore((s) => s.navLayout);
  const setNavLayout = usePreferencesStore((s) => s.setNavLayout);

  const next = navLayout === "sidebar" ? "topbar" : "sidebar";
  const Icon = navLayout === "sidebar" ? LayoutPanelLeft : PanelTop;
  const label = navLayout === "sidebar" ? "Switch to top navigation" : "Switch to side navigation";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={() => setNavLayout(next)}
        >
          <Icon className="h-[1.1rem] w-[1.1rem]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
