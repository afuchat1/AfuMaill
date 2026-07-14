import { useWindowDimensions } from "react-native";

/**
 * Breakpoint hook for the website artifact.
 *
 * Uses the real window width so the phone-sized viewport (mobile artifact
 * frame, ~390px) gets the mobile layout while the wide website artifact
 * frame (1920px) gets the full desktop layout.
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
