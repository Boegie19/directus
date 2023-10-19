import axios from 'axios';
import fs from 'node:fs/promises';
import type { Environment } from 'vitest';
import { USER } from '../common/variables';
import { getReversedTestIndex } from '../setup/sequential-tests';
import { sleep } from '../utils/sleep';

export default <Environment>{
	name: 'custom',
	transformMode: 'ssr',

	async setup(global) {
		const testFilePath = global.__vitest_worker__.ctx.files[0].split('blackbox')[1];
		const serverUrl = process.env['serverUrl'];

		if (!serverUrl) {
			throw 'Missing flow env variables';
		}


		while (true) {
			try {
				const response = await axios.get(`${serverUrl}/items/tests_flow_completed`, {
					params: {
						'aggregate[count]': 'id',
					},
					headers: {
						Authorization: `Bearer ${USER.TESTS_FLOW.TOKEN}`,
					},
				});

				if (global.__vitest_worker__.environmentTeardownRun) {
					break;
				}
			} catch (err) {
				continue;
			}

			await sleep(1000);
		}

		return {
			async teardown() {
				const body = {
					test_file_path: testFilePath,
				};

				await axios.post(`${serverUrl}/items/tests_flow_completed`, body, {
					headers: {
						Authorization: `Bearer ${USER.TESTS_FLOW.TOKEN}`,
						'Content-Type': 'application/json',
					},
				});
			},
		};
	},
};
