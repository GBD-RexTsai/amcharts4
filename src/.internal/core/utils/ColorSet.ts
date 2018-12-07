/**
 * This module contains ColorSet object definition
 */

/**
 * ============================================================================
 * IMPORTS
 * ============================================================================
 * @hidden
 */
import { BaseObject } from "../Base";
import { Color, color, iHSL } from "./Color";
import * as $colors from "./Colors";
import * as $type from "./Type";
import * as $utils from "./Utils";


/**
 * ============================================================================
 * REQUISITES
 * ============================================================================
 * @hidden
 */

/**
 * Defines an interface for objects identifying a color step.
 *
 * A "color step" object is used when [[ColorSet]] is generating colors, when
 * it has ran out of pre-set colors.
 *
 * It takes the last available color, then applies one or several of the
 * properties, like hue, or saturation with each subsequent generated color.
 */
export interface IColorSetStepOptions {
	hue: number;
	brighten: number;
	lighten: number;
	lightness: number;
	saturation: number;
}


/**
 * ============================================================================
 * MAIN CLASS
 * ============================================================================
 * @hidden
 */

/**
 * Represents a set of colors. Can also generate colors according to set rules.
 *
 * @important
 * @see {@link https://www.amcharts.com/docs/v4/concepts/colors/} for color-related info
 */
export class ColorSet extends BaseObject {

	/**
	 * Holds the list of the colors in this set. (preset or auto-generated)
	 *
	 * @type {Color[]}
	 */
	protected _list: Color[] = [];

	/**
	 * Current step in a color generator's cycle.
	 *
	 * @type {number}
	 */
	protected _currentStep: number = 0;

	/**
	 * Current pass in the color generator's cycle. Normally a generator would
	 * cycle through all available hue range, then repeat it, alternating other
	 * color properties, to generate distinctive colors.
	 *
	 * @type {number}
	 */
	protected _currentPass: number = 0;

	/**
	 * A base color. If there are no colors pre-set in the color list, ColorSet
	 * will use this color as a base when generating new ones, applying
	 * `stepOptions` and `passOptions` to this base color.
	 *
	 * @type {Color}
	 */
	public baseColor: Color = new Color({
		r: 103,
		g: 183,
		b: 220
	});

	/**
	 * Modifications to apply with each new generated color.
	 *
	 * @type {Partial<IColorSetStepOptions>}
	 */
	public stepOptions: Partial<IColorSetStepOptions> = {};

	/**
	 * Modifications to apply on top of `stepOptions` for each "pass" of the
	 * color generation.
	 *
	 * A "pass" is when ColorSet generates `minColors` number of colors.
	 *
	 * @type {Partial<IColorSetStepOptions>}
	 */
	public passOptions: Partial<IColorSetStepOptions> = {
		brighten: -0.2
	};

	/**
	 * An index increment to use when iterating through color list.
	 *
	 * Default is 1, which means returning each and every color.
	 *
	 * Setting it to a bigger number will make ColorSet `next()` iterator skip
	 * some colors.
	 *
	 * E.g. setting to 2, will return every second color in the list.
	 *
	 * This is useful, when the color list has colors that are too close each
	 * other for contrast.
	 *
	 * However, having bigger number will mean that `next()` iterator will go
	 * through the list quicker, and the generator will kick sooner.
	 *
	 * @type {number}
	 */
	public step: number = 1;

	/**
	 * A number of colors to generate in one "pass".
	 *
	 * This setting can be automatically overridden, if ColorSet has a list of
	 * pre-set colors. In such case ColorSet will generate exactly the same
	 * number of colors with each pass as there were colors in original set.
	 *
	 * @type {number}
	 */
	public minColors: number = 20;

	/**
	 * Do not let the "lightness" of generated color to fall below this
	 * threshold.
	 *
	 * @type {number}
	 */
	public minLightness: number = 0.2;

	/**
	 * Do not let the "lightness" of generated color to get above this threshold.
	 *
	 * @type {number}
	 */
	public maxLightness: number = 0.9;

	/**
	 * Randomly shuffle generated colors.
	 *
	 * @type {boolean}
	 */
	public shuffle: boolean = false;

	/**
	 * When colors are generated, based on `stepOptions`, each generated color
	 * gets either lighter or darker.
	 *
	 * If this is set to `true`, color generator will switch to opposing spectrum
	 * when reaching `minLightness` or `maxLightness`.
	 *
	 * E.g. if we start off with a red color, then gradually generate lighter
	 * colors through rose shades, then switch back to dark red and gradually
	 * increase the lightness of it until it reaches the starting red.
	 *
	 * If set to `false` it will stop there and cap lightness at whatever level
	 * we hit `minLightness` or `maxLightness`, which may result in a number of
	 * the same colors.
	 *
	 * @type {boolean}
	 */
	public wrap: boolean = true;

	/**
	 * Re-use same colors in the pre-set list, when ColorSet runs out of colors,
	 * rather than start generating new ones.
	 *
	 * @type {boolean}
	 */
	public reuse: boolean = false;

	/**
	 * Saturation of colors. This will change saturation of all colors of color
	 * set.
	 *
	 * It is recommended to set this in theme, as changing it at run time won't
	 * make the items to redraw and change color.
	 *
	 * @type {boolean}
	 */
	public saturation: number = 1;

	/**
	 * Constructor
	 */
	constructor() {
		super();
		this.className = "ColorSet";
		this.applyTheme();
	}

	/**
	 * Sets a list of pre-defined colors to use for the iterator.
	 *
	 * @param {Color[]} value Color list
	 */
	public set list(value: Color[]) {
		this._list = value;
	}

	/**
	 * Returns current list of colors.
	 *
	 * If there are none, a new list of colors is generated, based on various
	 * ColorSet settings.
	 *
	 * @return {Color[]} Color list
	 */
	public get list(): Color[] {
		if (!this._list) {
			this.generate(this.minColors);
		}
		return this._list;
	}

	/**
	 * Returns next color in the list using internal iterator counter.
	 *
	 * If `step` is set to something other than 1, it may return other color than
	 * exact next one in the list.
	 *
	 * @return {Color} Color
	 */
	public next(): Color {
		if (this.list.length <= this._currentStep) {
			if (this.reuse && this._currentPass == 0 && this._list.length) {
				this.minColors = this._list.length;
			}
			this.generate(this.minColors);
		}
		let color = this.list[this._currentStep];
		this._currentStep += this.step;
		return color.saturate(this.saturation);
	}

	/**
	 * Returns a color at specific index in the list.
	 *
	 * @param  {number}  i  Index
	 * @return {Color}      Color
	 */
	public getIndex(i: number): Color {
		if (this.list.length <= i) {
			if (this.reuse && this._currentPass == 0 && this._list.length) {
				this.minColors = this._list.length;
			}
			this.generate(this.minColors);
			return this.getIndex(i);
		}
		return this.list[i].saturate(this.saturation);
	}

	/**
	 * Resets internal iterator.
	 *
	 * Calling `next()` after this will return the very first color in the color
	 * list, even if it was already returned before.
	 */
	public reset(): void {
		this._currentStep = 0;
	}

	/**
	 * Generates colors based on the various ColorSet settings.
	 *
	 * @param {number} count Number of colors to generate
	 */
	public generate(count: number): void {

		// Init
		let curColor = this.currentColor;
		let hsl = $colors.rgbToHsl($type.getValue(curColor.rgb));
		let hueStep = $type.hasValue(this.stepOptions.hue) ? this.stepOptions.hue : 1 / count;
		let mods: IColorSetStepOptions = {
			brighten: 0,
			lighten: 0,
			hue: hsl.h,
			lightness: hsl.l,
			saturation: hsl.s
		};

		// Generate list of hues, and shuffle them
		let hues: number[] = [];
		if (this.reuse) {
			for (let i = 0; i < count; i++) {
				hues.push($colors.rgbToHsl($type.getValue(this._list[i].rgb)).h);
			}
		}
		else {
			for (let i = 0; i < count; i++) {
				let h = hsl.h + hueStep * i;
				if (this.wrap && (h > 1)) {
					h -= 1;
				}
				hues.push(h);
			}
		}

		// Shuffle colors randomly
		if (this.shuffle) {
			hues.sort((a: number, b: number) => {
				return Math.random() - 0.5;
			});
		}


		// Generate colors by rotating hue
		for (let i = 0; i < count; i++) {

			// Update hue
			if (this.reuse) {
				hsl = $colors.rgbToHsl($type.getValue(this._list[i].rgb));
			}
			else {
				hsl.h = <number>hues.shift();
			}

			// Apply HSL mods
			this.applyStepOptions(hsl, mods, i + 1, this._currentPass);

			// Convert back to Color
			let c = color($colors.hslToRgb(hsl));

			// Apply regular color mods
			let brighten = (this.stepOptions.brighten || 0) * (i + 1) + (this.passOptions.brighten || 0) * this._currentPass;
			if (brighten != 0) {
				if (this.wrap) {
					brighten = $utils.fitNumberRelative(brighten, this.minLightness, this.maxLightness);
				}
				else {
					brighten = $utils.fitNumber(brighten, this.minLightness, this.maxLightness);
				}
				c = c.brighten(brighten);
			}

			let lighten = (this.stepOptions.lighten || 0) * (i + 1) + (this.passOptions.lighten || 0) * this._currentPass;
			if (lighten != 0) {
				if (this.wrap) {
					lighten = $utils.fitNumberRelative(lighten, this.minLightness, this.maxLightness);
				}
				else {
					lighten = $utils.fitNumber(lighten, this.minLightness, this.maxLightness);
				}
				c = c.lighten(lighten);
			}
			this._list.push(c);
		}

		this._currentPass++;

	}

	/**
	 * Returns current last color. It's either the last color in the list of
	 * colors, or `baseColor` if list is empty.
	 *
	 * @return {Color} Color
	 */
	protected get currentColor(): Color {
		if (this._list.length == 0) {
			return this.baseColor.saturate(this.saturation);
		}
		else {
			return this._list[this._list.length - 1].saturate(this.saturation);
		}
	}

	/**
	 * Generates modifiers for color, based on what step and pass.
	 *
	 * @param {iHSL}                  hsl   Curren HSL value of the color to modify
	 * @param {IColorSetStepOptions}  base  The modifiers that were before modification to use as a base
	 * @param {number}                step  Current step
	 * @param {number}                pass  Current pass
	 */
	protected applyStepOptions(hsl: iHSL, base: IColorSetStepOptions, step: number, pass: number): void {

		// Process lightness
		hsl.l = base.lightness + (this.stepOptions.lightness || 0) * step + (this.passOptions.lightness || 0) * pass;

		if (this.wrap) {
			if (hsl.l > 1) {
				hsl.l = hsl.l - Math.floor(hsl.l);
			}
			else if (hsl.l < 0) {
				hsl.l = -(hsl.l - Math.floor(hsl.l));
			}
			hsl.l = $utils.fitNumberRelative(hsl.l, this.minLightness, this.maxLightness);
		}
		else {
			if (hsl.l > 1) {
				hsl.l = 1
			}
			else if (hsl.l < 0) {
				hsl.l = 0;
			}
			hsl.l = $utils.fitNumber(hsl.l, this.minLightness, this.maxLightness);
		}
	}


	/**
	 * Processes JSON-based config before it is applied to the object.
	 *
	 * @ignore Exclude from docs
	 * @param {object}  config  Config
	 */
	public processConfig(config?: { [index: string]: any }): void {

		if (config) {

			// Set up axis ranges
			if ($type.hasValue(config.list) && $type.isArray(config.list)) {
				for (let i = 0, len = config.list.length; i < len; i++) {
					if (!(config.list[i] instanceof Color)) {
						config.list[i] = color(config.list[i]);
					}
				}
			}
		}
		super.processConfig(config);
	}

}