/** Image-based wallpaper presets shown in the Settings picker.
 *  CSS gradient "themes" were removed — the ambient background gradient
 *  is now derived automatically from the user's accent color.
 */
export interface WallpaperPreset {
  id: string
  label: string
  /** CSS background used for the small swatch thumbnail in Settings */
  preview: string
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    // No image — the accent-tinted ambient gradient fills the background
    id: 'none',
    label: 'None',
    preview: 'linear-gradient(145deg, #0a0a14 0%, #08080d 100%)',
  },
  {
    // Bundled wallpaper.png image
    id: 'default',
    label: 'Default',
    preview: 'linear-gradient(145deg, #0a0f2e 0%, #1a0b3e 50%, #07192e 100%)',
  },
]
