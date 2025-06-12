<script setup lang="ts">
import { ref } from "vue";

const headerMsg = ref("Welcome to My Vue App");
const mainMsg = ref("This is the main content area.");
</script>
<template>
  <header>
    {{ headerMsg }}
  </header>

  <main>
    {{ mainMsg }}
  </main>
</template>
