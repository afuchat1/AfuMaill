{pkgs}: {
  deps = [
    pkgs.mesa
    pkgs.xorg.libXinerama
    pkgs.xorg.libXcursor
    pkgs.xorg.libXi
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
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
