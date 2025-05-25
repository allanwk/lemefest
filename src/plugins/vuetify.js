import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';

Vue.use(Vuetify);

export default new Vuetify({
    theme: {
        themes: {
          light: {
            primary: '#000084',
            secondary: '#e6e998',
            accent: '#d82621',
            error: '#d82621',
            background: '#fafafa',
          },
        },
      },
});
