<script setup lang="ts">
import { ref } from "vue";

const clicks = ref(0);

const onClick = () => {
  clicks.value++;
};
</script>
<template>
  <main>
    <button @click="onClick">Clicked {{ clicks }} time(s)</button>
  </main>
</template>
