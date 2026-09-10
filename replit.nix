{pkgs}: {
  deps = [
    pkgs.xorg.libX11
    pkgs.pango
    pkgs.gtk3
    pkgs.cairo
    pkgs.cups
    pkgs.atk
    pkgs.dbus
    pkgs.nss
    pkgs.nspr
    pkgs.glib
  ];
}
