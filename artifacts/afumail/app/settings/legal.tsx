import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SwipeBackView } from "@/components/SwipeBackView";
import { useColors } from "@/hooks/useColors";

const TABS = ["Terms of Service", "Privacy Policy"] as const;
type Tab = (typeof TABS)[number];

const TERMS = `Last updated: June 30, 2026

Welcome to AfuMail, a product of AfuChat Technologies Limited (Entebbe, Kittoro, Uganda). By using this application, you agree to the following terms.

1. ACCEPTANCE OF TERMS
By using the AfuMail mobile application, you agree to be bound by these Terms of Service and all applicable laws and regulations of Uganda and any jurisdiction in which you operate.

2. USE OF SERVICE
AfuMail is a closed email network for @afuchat.com accounts. You may only send and receive messages with other AfuMail users. You agree not to use the service for spam, harassment, or any unlawful purpose.

3. ACCOUNT RESPONSIBILITY
You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately if you suspect unauthorized use of your account.

4. CONTENT
You retain ownership of content you create. By using AfuMail, you grant AfuChat Technologies Limited a limited license to store and transmit your content solely to deliver the service.

5. TERMINATION
We reserve the right to suspend or terminate accounts that violate these terms without prior notice.

6. DISCLAIMERS
AfuMail is provided "as is" without warranties of any kind. We do not guarantee uptime or uninterrupted access.

7. LIMITATION OF LIABILITY
To the maximum extent permitted by Ugandan law, AfuChat Technologies Limited shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.

8. CHANGES TO TERMS
We may update these terms from time to time. Continued use of AfuMail after changes constitutes acceptance of the new terms.

9. CONTACT
AfuChat Technologies Limited
Entebbe, Kittoro, Uganda
For legal enquiries: legal@afuchat.com`;

const PRIVACY = `Last updated: June 30, 2026

AfuChat Technologies Limited ("we", "us") operates the AfuMail mobile application. This policy explains how we collect, use, and protect your information.

1. INFORMATION WE COLLECT
- Account information: name, username, email address
- Messages: content of emails you send and receive
- Optional recovery information: phone number, recovery email address
- App preferences stored securely in your account

2. HOW WE USE YOUR INFORMATION
We use your information solely to:
- Provide and maintain the AfuMail service
- Deliver emails between AfuMail users
- Enable account recovery when requested
- Improve app performance and reliability

3. DATA STORAGE
Your data is stored in secure cloud infrastructure with row-level security. Only you can access your own emails and profile data. No employee of AfuChat Technologies Limited can read your emails without your explicit consent.

4. DATA SHARING
We do not sell, trade, or share your personal information with third parties. We do not use your email content for advertising purposes.

5. DATA RETENTION
Your data is retained as long as your account is active. You may request deletion of your account and associated data at any time by contacting support.

6. SECURITY
We implement industry-standard security measures including encrypted connections (TLS), row-level access controls, and secure multi-factor authentication.

7. YOUR RIGHTS
Under applicable Ugandan and international data protection law, you have the right to:
- Access your personal data
- Correct inaccurate data
- Request deletion of your data
- Export your data

8. COOKIES & LOCAL STORAGE
AfuMail stores your preferences, search history, and session data securely in your account, synced across your devices. A minimal local cache is used only to keep your session signed in. No third-party tracking cookies are used.

9. CHILDREN'S PRIVACY
AfuMail is not intended for users under 13 years of age. We do not knowingly collect data from children.

10. CONTACT
AfuChat Technologies Limited
Entebbe, Kittoro, Uganda
Privacy enquiries: privacy@afuchat.com`;

export default function LegalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>(
    params.tab === "privacy" ? "Privacy Policy" : "Terms of Service"
  );

  return (
    <SwipeBackView>
      {(goBack) => (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {activeTab}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === tab ? colors.foreground : colors.mutedForeground,
                  fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {tab}
            </Text>
            {activeTab === tab && (
              <View style={[styles.tabIndicator, { backgroundColor: colors.foreground }]} />
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <Text style={[styles.content, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
          {activeTab === "Terms of Service" ? TERMS : PRIVACY}
        </Text>
      </ScrollView>
    </View>
      )}
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, letterSpacing: -0.3 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    gap: 0,
  },
  tabText: { fontSize: 13 },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    width: "60%",
    borderRadius: 1,
  },
  content: {
    fontSize: 14,
    lineHeight: 24,
  },
});
