import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import WebComposeModal from "@/components/web/WebComposeModal";
import WebEmailDetail from "@/components/web/WebEmailDetail";
import WebEmailList from "@/components/web/WebEmailList";
import WebSidebar from "@/components/web/WebSidebar";
import type { EmailFolder } from "@/context/EmailContext";
import { W } from "@/components/web/WebSidebar";

interface ComposeConfig {
  to?: string;
  subject?: string;
  body?: string;
}

export default function WebMainScreen() {
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeConfig, setComposeConfig] = useState<ComposeConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  function handleSelectFolder(folder: EmailFolder) {
    setCurrentFolder(folder);
    setSelectedEmailId(null);
    setSearchQuery("");
  }

  function handleSelectEmail(id: string) {
    setSelectedEmailId(id);
  }

  function handleCloseEmail() {
    setSelectedEmailId(null);
  }

  function handleCompose(config: ComposeConfig = {}) {
    setComposeConfig(config);
  }

  function handleCloseCompose() {
    setComposeConfig(null);
  }

  return (
    <View style={[styles.root, { backgroundColor: W.bg }]}>
      {/* Three-column layout */}
      <View style={styles.columns}>
        {/* Column 1 — Sidebar */}
        <WebSidebar
          currentFolder={currentFolder}
          onSelectFolder={handleSelectFolder}
          onCompose={() => handleCompose()}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setSelectedEmailId(null);
          }}
        />

        {/* Column 2 — Email list */}
        <WebEmailList
          currentFolder={currentFolder}
          selectedId={selectedEmailId}
          onSelectEmail={handleSelectEmail}
          searchQuery={searchQuery}
        />

        {/* Column 3 — Email detail */}
        <WebEmailDetail
          emailId={selectedEmailId}
          onClose={handleCloseEmail}
          onCompose={handleCompose}
        />
      </View>

      {/* Floating compose modal */}
      {composeConfig !== null && (
        <WebComposeModal
          config={composeConfig}
          onClose={handleCloseCompose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  columns: { flex: 1, flexDirection: "row" },
});
