/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { dialog, getCurrentWindow } from '@electron/remote';
import fs from 'fs';
import { dirname, join } from 'path';
import {
    currentPane as currentPaneSelector,
    logger,
    setCurrentPane,
} from 'pc-nrfconnect-shared';

import { options, updateTitle } from '../globals';
import { setFileLoadedAction } from '../slices/appSlice';
import { setChartState } from '../slices/chartSlice';
import { setDataLoggerState } from '../slices/dataLoggerSlice';
import { setTriggerState } from '../slices/triggerSlice';
import loadData from '../utils/loadFileHandler';
import { paneName } from '../utils/panes';
import { getLastSaveDir, setLastSaveDir } from '../utils/persistentStore';
import saveData from '../utils/saveFileHandler';

const getTimestamp = () =>
    new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);

export const save = () => async (_, getState) => {
    const saveFileName = `ppk-${getTimestamp()}-${paneName(getState())}.ppk`;
    const { filePath: filename } = await dialog.showSaveDialog({
        defaultPath: join(getLastSaveDir(), saveFileName),
    });
    if (!filename) {
        return;
    }
    setLastSaveDir(dirname(filename));

    const { data, bits, ...opts } = options;
    const dataToBeSaved = {
        data,
        bits,
        metadata: {
            options: { ...opts, currentPane: currentPaneSelector(getState()) },
            chartState: getState().app.chart,
            triggerState: getState().app.trigger,
            dataLoggerState: getState().app.dataLogger,
        },
    };

    const saved = await saveData(filename, dataToBeSaved);
    if (saved) {
        logger.info(`State saved to: ${filename}`);
    }
};

export const load = setLoading => async dispatch => {
    const {
        filePaths: [filename],
    } =
        (await dialog.showOpenDialog({
            defaultPath: getLastSaveDir(),
        })) || [];
    if (!filename) {
        return;
    }

    setLoading(true);
    logger.info(`Restoring state from ${filename}`);
    updateTitle(filename);
    const result = await loadData(filename);
    if (!result) {
        logger.error(`Error loading from ${filename}`);
        setLoading(false);
        return;
    }
    const { dataBuffer, bits, metadata } = result;

    const {
        chartState,
        triggerState,
        dataLoggerState,
        options: { currentPane, ...loadedOptions },
    } = metadata;

    Object.assign(options, loadedOptions);
    options.data = dataBuffer;
    options.bits = bits;

    dispatch(setChartState(chartState));
    dispatch(setFileLoadedAction({ loaded: true }));
    if (dataLoggerState !== null) {
        dispatch(setDataLoggerState({ state: dataLoggerState }));
    }
    if (triggerState !== null) {
        dispatch(setTriggerState(triggerState));
    }
    if (currentPane !== null) dispatch(setCurrentPane(currentPane));
    logger.info(`State successfully restored`);
    setLoading(false);
};

export const screenshot = () => async () => {
    const win = getCurrentWindow();
    const mainElement = document.querySelector('.core19-main-container');
    const { x, y, width, height } = mainElement.getBoundingClientRect();
    const image = await win.capturePage({
        x,
        y,
        width,
        height,
    });

    const timestamp = getTimestamp();
    const filters = [
        { name: 'PNG', extensions: ['png'] },
        { name: 'All Files', extensions: ['*'] },
    ];

    const { filePath: filename } = await dialog.showSaveDialog({
        defaultPath: join(getLastSaveDir(), `ppk-${timestamp}.png`),
        filters,
    });
    if (!filename) {
        return;
    }

    setLastSaveDir(dirname(filename));

    fs.writeFileSync(filename, image.toPNG());
};
