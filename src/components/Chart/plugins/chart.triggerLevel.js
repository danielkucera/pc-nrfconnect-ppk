/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { colors } from 'pc-nrfconnect-shared';

import { updateTriggerLevel } from '../../../actions/deviceActions';

const { gray700: color, nordicBlue } = colors;

const getTriggerLevelFromCoordinate = coordinate =>
    Math.round(Math.min(1000000, Math.max(0, coordinate)));

let dispatch = () => {
    throw new Error('Dispatch not passed to plugin yet!');
};

const plugin = {
    id: 'triggerLevel',

    getCoords(chartInstance) {
        const {
            chartArea: { left },
            scales: { yScale },
            options: { triggerLevel, triggerHandleVisible },
        } = chartInstance;
        if (triggerLevel === null || !triggerHandleVisible) {
            return null;
        }
        const y =
            chartInstance.triggerLine.y !== null
                ? chartInstance.triggerLine.y
                : yScale.getPixelForValue(triggerLevel);
        const width = 24;
        const height = 10;
        return {
            y: Math.ceil(y - 0.5) + 0.5,
            label: {
                x: left - width,
                y: y - height / 2 - 0.5,
                w: width,
                h: height,
            },
        };
    },

    pointerDownHandler(evt, chartInstance) {
        const { label } = this.getCoords(chartInstance) || {};
        if (!label) return;
        const { layerX, layerY } = evt || {};
        if (
            layerX >= label.x &&
            layerX <= label.x + label.w &&
            layerY >= label.y &&
            layerY <= label.y + label.h
        ) {
            chartInstance.triggerLine.y = layerY;
        }
    },

    pointerMoveHandler(evt, chartInstance) {
        if (chartInstance.triggerLine.y === null) return;
        const { label } = this.getCoords(chartInstance) || {};
        if (!label) return;
        chartInstance.triggerLine.y = evt.layerY;
        const {
            scales: { yScale },
        } = chartInstance;
        const level = getTriggerLevelFromCoordinate(
            yScale.getValueForPixel(chartInstance.triggerLine.y)
        );
        dispatch(updateTriggerLevel(level));
    },

    pointerLeaveHandler(chartInstance) {
        if (chartInstance.triggerLine.y !== null) {
            const {
                scales: { yScale },
            } = chartInstance;
            const level = getTriggerLevelFromCoordinate(
                yScale.getValueForPixel(chartInstance.triggerLine.y)
            );
            dispatch(updateTriggerLevel(level));
        }
        chartInstance.triggerLine.y = null;
    },

    beforeInit(chartInstance) {
        chartInstance.triggerLine = { y: null };
        const { canvas } = chartInstance.$context.chart.ctx;
        canvas.addEventListener('pointerdown', evt =>
            plugin.pointerDownHandler(evt, chartInstance)
        );
        canvas.addEventListener('pointermove', evt =>
            plugin.pointerMoveHandler(evt, chartInstance)
        );
        canvas.addEventListener('pointerup', () =>
            plugin.pointerLeaveHandler(chartInstance)
        );
        canvas.addEventListener('pointerleave', () =>
            plugin.pointerLeaveHandler(chartInstance)
        );
    },

    afterDraw(chartInstance) {
        const {
            chartArea: { left, right, top, bottom },
            // chart: { ctx },
        } = chartInstance;
        const { ctx } = chartInstance.$context.chart;

        const coords = this.getCoords(chartInstance);

        if (!coords) return;
        const { y, label } = coords;

        ctx.save();

        function drawDashedLine() {
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = color;
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.moveTo(left, y - 1); // Moving it 1px up seems to center it on the label
            ctx.lineTo(right, y - 1); // Moving it 1px up seems to center it on the label
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
        }

        function drawHandle() {
            ctx.fillStyle = nordicBlue;

            ctx.translate(label.x, label.y);
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.bezierCurveTo(0, 1, 1, 0, 2, 0);
            const curveStart = label.w - 8;
            ctx.lineTo(curveStart, 0);
            ctx.bezierCurveTo(
                label.w - 5,
                0,
                label.w,
                label.h / 2,
                label.w,
                label.h / 2
            );
            ctx.bezierCurveTo(
                label.w,
                label.h / 2,
                label.w - 5,
                label.h,
                curveStart,
                label.h
            );
            ctx.lineTo(2, label.h);
            ctx.bezierCurveTo(1, label.h, 0, label.h - 1, 0, label.h - 2);
            ctx.closePath();
            ctx.fill();

            ctx.lineWidth = 1;
            ctx.strokeStyle = colors.gray50;
            ctx.beginPath();
            ctx.closePath();
            ctx.stroke();
        }

        if (y > top && y < bottom) {
            drawDashedLine();
            drawHandle();
        } else {
            // draw indicators
            ctx.fillStyle = nordicBlue;
            if (y < top) {
                ctx.translate(label.x + 12, top + 12);
            } else {
                ctx.translate(label.x + 12, bottom - 12);
                ctx.rotate(Math.PI);
            }
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(3.5, 6);
            ctx.lineTo(-3.5, 6);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    },
};

export default dispatchFromComponent => {
    dispatch = dispatchFromComponent;
    return plugin;
};
