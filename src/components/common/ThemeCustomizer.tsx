import { Paintbrush } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  type AccentPreset,
  type IconTheme,
  type RadiusPreset,
  type NavDensity,
  type FontPreset,
  usePreferencesStore,
} from "@/stores/preferences";

const COLOR_PRESETS: {
  value: AccentPreset;
  label: string;
  swatchClass: string;
}[] = [
  { value: "blue", label: "Blue", swatchClass: "bg-blue-500" },
  { value: "emerald", label: "Emerald", swatchClass: "bg-emerald-500" },
  { value: "violet", label: "Violet", swatchClass: "bg-violet-500" },
  { value: "amber", label: "Amber", swatchClass: "bg-amber-400" },
  { value: "rose", label: "Rose", swatchClass: "bg-rose-500" },
];

const ICON_THEMES: { value: IconTheme; label: string; hint: string }[] = [
  { value: "color", label: "Color", hint: "Soft color badges" },
  { value: "gradient", label: "Gradient", hint: "Vibrant gradients" },
  { value: "mono", label: "Mono", hint: "Minimal icons" },
];

const RADIUS_PRESETS: { value: RadiusPreset; label: string; preview: string }[] = [
  { value: "sm", label: "Tight", preview: "rounded-md" },
  { value: "md", label: "Soft", preview: "rounded-lg" },
  { value: "lg", label: "Bubble", preview: "rounded-2xl" },
];

const NAV_DENSITIES: { value: NavDensity; label: string; hint: string }[] = [
  { value: "comfortable", label: "Comfortable", hint: "More breathing room" },
  { value: "compact", label: "Compact", hint: "More items per screen" },
];

const FONT_PRESETS: { value: FontPreset; label: string; sample: string; fontFamily: string }[] = [
  { value: "outfit", label: "Outfit", sample: "ZarnTaxSync", fontFamily: '"Outfit"' },
  { value: "jakarta", label: "Plus Jakarta Sans", sample: "ZarnTaxSync", fontFamily: '"Plus Jakarta Sans"' },
  { value: "manrope", label: "Manrope", sample: "ZarnTaxSync", fontFamily: '"Manrope"' },
  { value: "dm", label: "DM Sans", sample: "ZarnTaxSync", fontFamily: '"DM Sans"' },
  { value: "sora", label: "Sora", sample: "ZarnTaxSync", fontFamily: '"Sora"' },
  { value: "rubik", label: "Rubik", sample: "ZarnTaxSync", fontFamily: '"Rubik"' },
  { value: "work", label: "Work Sans", sample: "ZarnTaxSync", fontFamily: '"Work Sans"' },
  { value: "noto", label: "Noto Sans", sample: "ZarnTaxSync", fontFamily: '"Noto Sans"' },
];

export function ThemeCustomizer() {
  const accentPreset = usePreferencesStore((s) => s.accentPreset);
  const setAccentPreset = usePreferencesStore((s) => s.setAccentPreset);
  const iconTheme = usePreferencesStore((s) => s.iconTheme);
  const setIconTheme = usePreferencesStore((s) => s.setIconTheme);
  const radiusPreset = usePreferencesStore((s) => s.radiusPreset);
  const setRadiusPreset = usePreferencesStore((s) => s.setRadiusPreset);
  const navDensity = usePreferencesStore((s) => s.navDensity);
  const setNavDensity = usePreferencesStore((s) => s.setNavDensity);
  const fontPreset = usePreferencesStore((s) => s.fontPreset);
  const setFontPreset = usePreferencesStore((s) => s.setFontPreset);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open appearance customizer">
          <Paintbrush className="h-[1.1rem] w-[1.1rem]" />
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Customizer</SheetTitle>
          <SheetDescription>Make the UI feel more modern, colorful, and personal.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="colors" className="mt-5">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Type</TabsTrigger>
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
            <TabsTrigger value="shape">Shape</TabsTrigger>
          </TabsList>

          <TabsContent value="colors">
            <div className="grid grid-cols-2 gap-3">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setAccentPreset(p.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                    accentPreset === p.value && "border-primary ring-1 ring-primary/20",
                  )}
                >
                  <span className={cn("h-10 w-10 rounded-xl", p.swatchClass)} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.label}</div>
                    <div className="truncate text-xs text-muted-foreground">Primary + focus</div>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="typography">
            <div className="grid grid-cols-1 gap-3">
              {FONT_PRESETS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFontPreset(f.value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                    fontPreset === f.value && "border-primary ring-1 ring-primary/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{f.label}</div>
                      <div
                        className="truncate text-xs text-muted-foreground"
                        style={{ fontFamily: f.fontFamily }}
                      >
                        {f.sample} — The quick brown fox
                      </div>
                    </div>
                    <div
                      className="shrink-0 text-lg font-semibold text-foreground"
                      style={{ fontFamily: f.fontFamily }}
                    >
                      Aa
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="navigation">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {ICON_THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setIconTheme(t.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                      iconTheme === t.value && "border-primary ring-1 ring-primary/20",
                    )}
                  >
                    <div className="text-sm font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.hint}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {NAV_DENSITIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setNavDensity(d.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                      navDensity === d.value && "border-primary ring-1 ring-primary/20",
                    )}
                  >
                    <div className="text-sm font-medium">{d.label}</div>
                    <div className="text-xs text-muted-foreground">{d.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shape">
            <div className="grid grid-cols-3 gap-3">
              {RADIUS_PRESETS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRadiusPreset(r.value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                    radiusPreset === r.value && "border-primary ring-1 ring-primary/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">Corners</div>
                    </div>
                    <span
                      className={cn(
                        "h-8 w-8 border bg-background shadow-sm",
                        r.preview,
                      )}
                    />
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
