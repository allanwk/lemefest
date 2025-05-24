<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
    >
    </v-app-bar>

    <v-main>
      <StartForm v-if='page === "StartForm"' @next='page = "ResourceList"'/>
      <ResourceList v-if='page === "ResourceList"'/>
    </v-main>
  </v-app>
</template>

<script>
import StartForm from './components/StartForm';
import ResourceList from './components/ResourceList';

export default {
  name: 'App',

  components: {
    StartForm,
    ResourceList,
  },

  data: () => ({
    page: 'StartForm',
  }),
};
</script>
