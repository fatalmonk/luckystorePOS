import { usePathname } from 'expo-router';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

export interface TabBarScrollContextState {
  tabBarTranslateY: Animated.Value;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showTabBar: () => void;
  hideTabBar: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const TabBarScrollContext = createContext<TabBarScrollContextState | null>(null);

export function TabBarScrollProvider({ children }: { children: ReactNode }) {
  const [tabBarTranslateY] = useState(() => new Animated.Value(0));
  const lastScrollY = useRef(0);
  const isVisibleRef = useRef(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (active) setReduceMotion(enabled);
      },
    );

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  const showTabBar = useCallback(() => {
    if (!isVisibleRef.current) {
      isVisibleRef.current = true;
      if (reduceMotion) {
        tabBarTranslateY.setValue(0);
        return;
      }
      Animated.spring(tabBarTranslateY, {
        toValue: 0,
        tension: 75,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  }, [reduceMotion, tabBarTranslateY]);

  const hideTabBar = useCallback(() => {
    if (reduceMotion) return;
    if (isVisibleRef.current) {
      isVisibleRef.current = false;
      Animated.spring(tabBarTranslateY, {
        toValue: 120,
        tension: 75,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  }, [reduceMotion, tabBarTranslateY]);

  useEffect(() => {
    // Restore tab bar visibility and reset scroll baseline on route change
    showTabBar();
    lastScrollY.current = 0;
  }, [pathname, showTabBar]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - lastScrollY.current;

      // Always show when near top or bounce
      if (currentY <= 20) {
        showTabBar();
      } else if (diff > 12 && currentY > 60) {
        // Scrolling down -> hide island bar
        hideTabBar();
      } else if (diff < -10) {
        // Scrolling up -> show island bar
        showTabBar();
      }

      lastScrollY.current = Math.max(0, currentY);
    },
    [showTabBar, hideTabBar],
  );

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const value = useMemo(
    () => ({
      tabBarTranslateY,
      onScroll,
      showTabBar,
      hideTabBar,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [
      tabBarTranslateY,
      onScroll,
      showTabBar,
      hideTabBar,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
    ],
  );

  return (
    <TabBarScrollContext.Provider value={value}>
      {children}
    </TabBarScrollContext.Provider>
  );
}

export function useTabBarScroll(): TabBarScrollContextState {
  const ctx = useContext(TabBarScrollContext);
  if (!ctx) {
    throw new Error('useTabBarScroll must be used within a TabBarScrollProvider');
  }
  return ctx;
}
