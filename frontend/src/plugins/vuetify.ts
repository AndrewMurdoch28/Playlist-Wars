// Styles
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

// Vuetify
import { createVuetify } from "vuetify";

export default createVuetify({
  theme: {
    defaultTheme: "customTheme",
    themes: {
      customTheme: {
        colors: {
          primary: "#0c56cc",
          success: "#087313",
          error: "#c40606",
          card: "#171716",
          gray: "#757474",
        },
      },
    },
  },
});
