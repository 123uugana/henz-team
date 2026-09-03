import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "mn.henzhurag.app",
  appName: "Хэнц Хурга",
  webDir: "public",
  server: {
    url: "https://hents-hurga-web.uuganbayrxx0716.workers.dev",
    cleartext: false,
  },
};

export default config;
