import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { getTabsForRole } from "./tabConfig";
import { TopBar } from "./TopBar";
import { BottomTabBar } from "./BottomTabBar";
import { CartFlyOverlay } from "../components/ui/CartFlyOverlay";

const Tab = createBottomTabNavigator();

export function TabsShell() {
  const { usuario } = useAuth();
  const tabs = getTabsForRole(usuario?.rol ?? "comprador");

  return (
    <View style={{ flex: 1 }}>
      <TopBar />
      <Tab.Navigator screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }} tabBar={(props) => <BottomTabBar {...props} tabs={tabs} />}>
        {tabs.map((t) => (
          <Tab.Screen key={t.name} name={t.name} component={t.component} />
        ))}
      </Tab.Navigator>
      <CartFlyOverlay />
    </View>
  );
}
