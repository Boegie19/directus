import api from '@/api';
import { useServerStore } from '@/stores/server';
import type { Revision, RevisionWithTime, RevisionsByDate } from '@/types/revisions';
import { localizedFormat } from '@/utils/localized-format';
import { localizedFormatDistance } from '@/utils/localized-format-distance';
import { unexpectedError } from '@/utils/unexpected-error';
import { Action } from '@directus/constants';
import type { ContentVersion, Filter } from '@directus/types';
import { format, isThisYear, isToday, isYesterday, parseISO } from 'date-fns';
import { groupBy, orderBy } from 'lodash';
import { Ref, ref, unref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

type UseRevisionsOptions = {
	action?: Action;
};

export function useRevisions(
	collection: Ref<string>,
	primaryKey: Ref<number | string>,
	version: Ref<ContentVersion | null>,
	options?: UseRevisionsOptions
) {
	const { t } = useI18n();
	const { info } = useServerStore();

	const revisions = ref<Revision[] | null>(null);
	const revisionsByDate = ref<RevisionsByDate[] | null>(null);
	const loading = ref(false);
	const revisionsCount = ref(0);
	const created = ref<Revision>();
	const pagesCount = ref(0);

	watch([collection, primaryKey, version], () => getRevisions(), { immediate: true });

	return { created, revisions, revisionsByDate, loading, refresh, revisionsCount, pagesCount };

	async function getRevisions(page = 0) {
		if (typeof unref(primaryKey) === 'undefined') return;

		loading.value = true;
		const pageSize = info.queryLimit?.max && info.queryLimit.max !== -1 ? Math.min(10, info.queryLimit.max) : 10;

		try {
			const filter: Filter = {
				_and: [
					{
						collection: {
							_eq: unref(collection),
						},
					},
					{
						item: {
							_eq: unref(primaryKey),
						},
					},
					{
						version: version.value
							? {
									_eq: version.value.id,
							  }
							: { _null: true },
					},
				],
			};

			if (options?.action) {
				filter._and.push({
					activity: {
						action: {
							_eq: options?.action,
						},
					},
				});
			}

			type RevisionResponse = { data: Revision[]; meta: { filter_count: number } };

			const response = await api.get<RevisionResponse>(`/revisions`, {
				params: {
					filter,
					sort: '-id',
					limit: pageSize,
					page,
					fields: [
						'id',
						'data',
						'delta',
						'collection',
						'item',
						'activity.action',
						'activity.timestamp',
						'activity.user.id',
						'activity.user.email',
						'activity.user.first_name',
						'activity.user.last_name',
						'activity.ip',
						'activity.user_agent',
						'activity.origin',
					],
					meta: ['filter_count'],
				},
			});

			if (!created.value) {
				const createdResponse = await api.get<RevisionResponse>(`/revisions`, {
					params: {
						filter: {
							collection: {
								_eq: unref(collection),
							},
							item: {
								_eq: unref(primaryKey),
							},
							version: { _null: true },
							activity: {
								action: {
									_eq: unref(version) ? Action.VERSION_SAVE : Action.CREATE,
								},
							},
						},
						sort: '-id',
						limit: 1,
						fields: [
							'id',
							'data',
							'delta',
							'collection',
							'item',
							'activity.action',
							'activity.timestamp',
							'activity.user.id',
							'activity.user.email',
							'activity.user.first_name',
							'activity.user.last_name',
							'activity.ip',
							'activity.user_agent',
							'activity.origin',
						],
						meta: ['filter_count'],
					},
				});

				created.value = createdResponse.data.data?.[0];
			}

			const revisionsGroupedByDate = groupBy(
				response.data.data.filter((revision) => !!revision.activity),
				(revision) => {
					// revision's timestamp date is in iso-8601
					const date = new Date(new Date(revision.activity.timestamp).toDateString());
					return date;
				}
			);

			const revisionsGrouped: RevisionsByDate[] = [];

			for (const [key, value] of Object.entries(revisionsGroupedByDate)) {
				const date = new Date(key);
				const today = isToday(date);
				const yesterday = isYesterday(date);
				const thisYear = isThisYear(date);

				let dateFormatted: string;

				if (today) dateFormatted = t('today');
				else if (yesterday) dateFormatted = t('yesterday');
				else if (thisYear) dateFormatted = localizedFormat(date, String(t('date-fns_date_short_no_year')));
				else dateFormatted = localizedFormat(date, String(t('date-fns_date_short')));

				const revisions: RevisionWithTime[] = [];

				for (const revision of value) {
					revisions.push({
						...revision,
						timestampFormatted: await getFormattedDate(revision.activity?.timestamp),
						timeRelative: `${getTime(revision.activity?.timestamp)} (${localizedFormatDistance(
							parseISO(revision.activity?.timestamp),
							new Date(),
							{
								addSuffix: true,
							}
						)})`,
					});
				}

				revisionsGrouped.push({
					date: date,
					dateFormatted: String(dateFormatted),
					revisions,
				});
			}

			revisionsByDate.value = orderBy(revisionsGrouped, ['date'], ['desc']);
			revisions.value = orderBy(response.data.data, ['activity.timestamp'], ['desc']);
			revisionsCount.value = response.data.meta.filter_count;
			pagesCount.value = Math.ceil(revisionsCount.value / pageSize);
		} catch (error) {
			unexpectedError(error);
		} finally {
			loading.value = false;
		}
	}

	async function refresh(page = 0) {
		await getRevisions(page);
	}

	function getTime(timestamp: string) {
		return format(new Date(timestamp), String(t('date-fns_time')));
	}

	async function getFormattedDate(timestamp: string) {
		const date = localizedFormat(new Date(timestamp), String(t('date-fns_date_short')));
		const time = localizedFormat(new Date(timestamp), String(t('date-fns_time')));

		return `${date} (${time})`;
	}
}
