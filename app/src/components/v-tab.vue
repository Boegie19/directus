<script setup lang="ts">
import { inject, ref } from 'vue';
import { useGroupable } from '@directus/composables';

interface Props {
	/** A custom value to be used with `v-tabs` */
	value?: string | number;
	/** Disable the tab */
	disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	value: undefined,
	disabled: false,
});

const { active, toggle } = useGroupable({
	value: props.value,
	group: 'v-tabs',
});

const vertical = inject('v-tabs-vertical', ref(false));

function onClick() {
	if (props.disabled === false) toggle();
}
</script>

<template>
	<v-list-item v-if="vertical" class="v-tab vertical" :active="active" :disabled="disabled" clickable @click="onClick">
		<slot v-bind="{ active, toggle }" />
	</v-list-item>
	<div v-else class="v-tab horizontal" :class="{ active, disabled }" @click="onClick">
		<slot v-bind="{ active, toggle }" />
	</div>
</template>

<style lang="scss" scoped>
.v-tab.horizontal {
	color: var(--theme--foreground-subdued);
	font-weight: 500;
	font-size: 14px;
	background-color: var(--theme--background-page);
	transition: color var(--fast) var(--transition);

	&:hover,
	&.active {
		color: var(--theme--foreground);
		background-color: var(--theme--background-page);
	}

	&.disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
}
</style>
