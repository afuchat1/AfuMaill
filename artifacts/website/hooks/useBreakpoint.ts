import { useWindowDimensions } from "react-native";

/**
 * Breakpoint hook for the website artifact.
 * Uses real window width so the layout adapts to whichever frame it's in.
 */
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    width,
  };
}
