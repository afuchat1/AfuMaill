import { useWindowDimensions } from "react-native";

/**
 * Breakpoint hook for the website artifact.
 *
 * isMobile is permanently false — the website always renders the desktop
 * two-column layout regardless of how narrow the Replit preview pane is.
 * The mobile artifact (port 8099, afumail) handles the narrow/mobile view.
 */
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    isMobile: false,
    isTablet: width >= 768 && width < 1024,
    isDesktop: true,
    width,
  };
}
