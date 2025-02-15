/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint no-plusplus: off */
/* eslint-disable @typescript-eslint/no-non-null-assertion  -- temporarily added to be conservative while converting to typescript */

import { numberOfDigitalChannels, sampleTimestamp } from '../../../globals';
import { lineDataForBitState } from '../../../utils/bitConversion';
import { createEmptyArrayWithDigitalChannelStates } from './commonBitDataFunctions';
import {
    BitStateIndexType,
    DigitalChannelStates,
    TimestampType,
} from './dataTypes';

export default () => ({
    lineData: [...Array(numberOfDigitalChannels)].map(
        () =>
            ({
                mainLine: createEmptyArrayWithDigitalChannelStates(),
                uncertaintyLine: createEmptyArrayWithDigitalChannelStates(),
            } as DigitalChannelStates)
    ),
    bitIndexes: new Array(numberOfDigitalChannels),
    previousBitStates: new Array(numberOfDigitalChannels),
    digitalChannelsToCompute: undefined as number[] | undefined,
    latestTimestamp: undefined as sampleTimestamp,

    initialise(digitalChannelsToCompute: number[]) {
        this.bitIndexes.fill(0);
        this.previousBitStates.fill(null);
        this.digitalChannelsToCompute = digitalChannelsToCompute;
    },

    storeEntry(
        timestamp: TimestampType,
        bitNumber: number,
        bitState: BitStateIndexType
    ) {
        const current = this.lineData[bitNumber];
        const bitIndex = this.bitIndexes[bitNumber];
        const lineData = lineDataForBitState[bitState];

        current.mainLine[bitIndex].x = timestamp;
        current.mainLine[bitIndex].y = lineData.mainLine;

        current.uncertaintyLine[bitIndex].x = timestamp;
        current.uncertaintyLine[bitIndex].y = lineData.uncertaintyLine;

        ++this.bitIndexes[bitNumber];
    },

    storeBit(
        timestamp: TimestampType,
        bitNumber: number,
        bitState: BitStateIndexType
    ) {
        this.latestTimestamp = timestamp;

        const bitChanged = this.previousBitStates[bitNumber] !== bitState;
        if (bitChanged) {
            this.storeEntry(timestamp, bitNumber, bitState);

            this.previousBitStates[bitNumber] = bitState;
        }
    },

    addFinalEntries() {
        this.digitalChannelsToCompute!.forEach(i => {
            const hasEntry = this.bitIndexes[i] > 0;
            const lastEntryIsNotForLastTimestamp =
                this.latestTimestamp !==
                this.lineData[i].mainLine[this.bitIndexes[i] - 1]?.x;

            if (hasEntry && lastEntryIsNotForLastTimestamp) {
                this.storeEntry(
                    this.latestTimestamp!,
                    i,
                    this.previousBitStates[i]
                );
            }
        });
    },

    getLineData() {
        this.addFinalEntries();

        return this.lineData.map((bitData, i) => ({
            mainLine: bitData.mainLine.slice(0, this.bitIndexes[i]),
            uncertaintyLine: bitData.uncertaintyLine.slice(
                0,
                this.bitIndexes[i]
            ),
        }));
    },
});
