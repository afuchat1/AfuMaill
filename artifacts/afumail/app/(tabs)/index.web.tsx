import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import WebAccountPanel from "@/components/web/WebAccountPanel";
import WebComposeModal from "@/components/web/WebComposeModal";
import WebEmailDetail from "@/components/web/WebEmailDetail";
import WebEmailList from "@/components/web/WebEmailList";
import WebSecurityPanel from "@/components/web/WebSecurityPanel";
import WebSidebar, { type CurrentView } from "@/components/web/WebSidebar";
import { W } from "@/components/web/webColors";
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

export default function WebMainScreen() {
  const [currentView, setCurrentView] = useState<CurrentView>("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeConfig, setComposeConfig] = useState<ComposeConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  function handleSelectView(view: CurrentView) {
    setCurrentView(view);
    setSelectedEmailId(null);
    if (isMailView(view)) {
      // keep search when switching mail folders, clear when going to account
    } else {
      setSearchQuery("");
    }
  }

  function handleCompose(config: ComposeConfig = {}) {
    setComposeConfig(config);
  }

  return (
    <View style={[styles.root, { backgroundColor: W.bg }]}>
      <View style={styles.layout}>
        {/* Sidebar — always visible, always branded */}
        <WebSidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          onCompose={() => handleCompose()}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setSelectedEmailId(null);
            // If searching while in account view, switch to inbox
            if (!isMailView(currentView)) setCurrentView("inbox");
          }}
        />

        {/* Main content area */}
        {isMailView(currentView) ? (
          // Mail: 3-column layout
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
          // Account: full-width panel (takes the remaining 2 columns)
          <View style={[styles.panelArea, { backgroundColor: W.bg }]}>
            {currentView === "profile" && <WebAccountPanel />}
            {currentView === "security" && <WebSecurityPanel initialTab="overview" />}
            {currentView === "sessions" && <WebSecurityPanel initialTab="sessions" />}
          </View>
        )}
      </View>

      {/* Floating compose modal — rendered above everything */}
      {composeConfig !== null && (
        <WebComposeModal
          config={composeConfig}
          onClose={() => setComposeConfig(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  layout: { flex: 1, flexDirection: "row" },
  panelArea: { flex: 1 },
});
