import { useWindowDimensions } from "react-native";

/**
 * Breakpoint hook for the website artifact.
 *
 * The website is always a desktop/web experience — `isMobile` is permanently
 * false so the two-column desktop layout always renders regardless of the
 * viewport or preview-pane width reported by useWindowDimensions.
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
