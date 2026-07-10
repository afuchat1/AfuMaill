import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import WebAccountPanel from "@/components/web/WebAccountPanel";
import WebAiChat from "@/components/web/WebAiChat";
import WebComposeModal from "@/components/web/WebComposeModal";
import WebEmailDetail from "@/components/web/WebEmailDetail";
import WebEmailList from "@/components/web/WebEmailList";
import WebSecurityPanel from "@/components/web/WebSecurityPanel";
import WebSidebar, { type CurrentView } from "@/components/web/WebSidebar";
import MobileBottomTabBar from "@/components/web/MobileBottomTabBar";
import MobileDrawer from "@/components/web/MobileDrawer";
import MobileHeader from "@/components/web/MobileHeader";
import { W } from "@/components/web/webColors";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useEmails } from "@/context/EmailContext";
import type { EmailFolder } from "@/context/EmailContext";

interface ComposeConfig {
  to?: string;
  subject?: string;
  body?: string;
}

const MAIL_VIEWS: EmailFolder[] = ["inbox", "starred", "sent", "drafts", "archived", "spam", "trash"];
function isMailView(v: CurrentView): v is EmailFolder {
  return MAIL_VIEWS.includes(v as EmailFolder);
}

const FOLDER_LABELS: Record<string, string> = {
  inbox: "Inbox", starred: "Starred", sent: "Sent", drafts: "Drafts",
  archived: "Archive", spam: "Spam", trash: "Trash",
  profile: "Profile & Account", security: "Security & Privacy", sessions: "Sessions & Devices",
};

export default function WebMainScreen() {
  const { isMobile } = useBreakpoint();
  const { unreadCount } = useEmails();

  const [currentView, setCurrentView] = useState<CurrentView>("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeConfig, setComposeConfig] = useState<ComposeConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  function handleSelectView(view: CurrentView) {
    setCurrentView(view);
    setSelectedEmailId(null);
    setShowMobileSearch(false);
    if (!isMailView(view)) setSearchQuery("");
  }

  function handleCompose(config: ComposeConfig = {}) {
    setComposeConfig(config);
  }

  // Mobile: when an email is selected in a mail folder, show the detail pane full-screen
  const showingMobileDetail = isMobile && !!selectedEmailId && isMailView(currentView);

  // ── MOBILE LAYOUT ───────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <View style={[styles.root, { backgroundColor: W.bg }]}>

        {showingMobileDetail ? (
          // Full-screen email reader — back button returns to list
          <WebEmailDetail
            emailId={selectedEmailId}
            onClose={() => setSelectedEmailId(null)}
            onCompose={handleCompose}
          />
        ) : isMailView(currentView) ? (
          // Email list with mobile header + bottom tabs
          <>
            <MobileHeader
              title={searchQuery ? "Search results" : FOLDER_LABELS[currentView] ?? "Inbox"}
              onOpenDrawer={() => setDrawerOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                setSelectedEmailId(null);
              }}
              showSearch={showMobileSearch}
              onToggleSearch={() => {
                setShowMobileSearch((v) => !v);
                if (showMobileSearch) setSearchQuery("");
              }}
            />
            <View style={{ flex: 1 }}>
              <WebEmailList
                currentFolder={currentView}
                selectedId={selectedEmailId}
                onSelectEmail={setSelectedEmailId}
                searchQuery={searchQuery}
              />
            </View>
            <MobileBottomTabBar
              currentView={currentView}
              onSelectView={handleSelectView}
              onCompose={() => handleCompose()}
              onOpenMenu={() => setDrawerOpen(true)}
              unreadCount={unreadCount}
            />
          </>
        ) : (
          // Account / Security panel with header + bottom tabs
          <>
            <MobileHeader
              title={FOLDER_LABELS[currentView] ?? "Account"}
              onBack={() => handleSelectView("inbox")}
            />
            <View style={{ flex: 1 }}>
              {currentView === "profile"  && <WebAccountPanel />}
              {currentView === "security" && <WebSecurityPanel initialTab="overview" />}
              {currentView === "sessions" && <WebSecurityPanel initialTab="sessions" />}
            </View>
            <MobileBottomTabBar
              currentView={currentView}
              onSelectView={handleSelectView}
              onCompose={() => handleCompose()}
              onOpenMenu={() => setDrawerOpen(true)}
              unreadCount={unreadCount}
            />
          </>
        )}

        {/* Compose — full-screen sheet on mobile */}
        {composeConfig !== null && (
          <WebComposeModal
            config={composeConfig}
            onClose={() => setComposeConfig(null)}
          />
        )}

        {/* Nav drawer — slide in from left */}
        {drawerOpen && (
          <MobileDrawer
            currentView={currentView}
            onSelectView={(v) => { handleSelectView(v); setDrawerOpen(false); }}
            onClose={() => setDrawerOpen(false)}
          />
        )}

        {/* Floating AI chat — available on all views */}
        <WebAiChat />
      </View>
    );
  }

  // ── DESKTOP / TABLET LAYOUT (unchanged) ─────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: W.bg }]}>
      <View style={styles.layout}>
        <WebSidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          onCompose={() => handleCompose()}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setSelectedEmailId(null);
            if (!isMailView(currentView)) setCurrentView("inbox");
          }}
        />

        {isMailView(currentView) ? (
          <>
            <WebEmailList
              currentFolder={currentView}
              selectedId={selectedEmailId}
              onSelectEmail={setSelectedEmailId}
              searchQuery={searchQuery}
            />
            <WebEmailDetail
              emailId={selectedEmailId}
              onClose={() => setSelectedEmailId(null)}
              onCompose={handleCompose}
            />
          </>
        ) : (
          <View style={[styles.panelArea, { backgroundColor: W.bg }]}>
            {currentView === "profile"  && <WebAccountPanel />}
            {currentView === "security" && <WebSecurityPanel initialTab="overview" />}
            {currentView === "sessions" && <WebSecurityPanel initialTab="sessions" />}
          </View>
        )}
      </View>

      {composeConfig !== null && (
        <WebComposeModal
          config={composeConfig}
          onClose={() => setComposeConfig(null)}
        />
      )}

      {/* Floating AI chat — available on all views */}
      <WebAiChat />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  layout: { flex: 1, flexDirection: "row" },
  panelArea: { flex: 1 },
});
