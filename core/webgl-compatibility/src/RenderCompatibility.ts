/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Compatibility
 */

import { Capabilities } from "./Capabilities";

/** A type describing either a WebGL 1 or WebGL 2 rendering context.
 * @public
 */
export type WebGLContext = WebGLRenderingContext | WebGL2RenderingContext;

/** Enumerates the required and optional WebGL features used by the [RenderSystem]($frontend).
 * @public
 */
export enum WebGLFeature {
  /** This feature allows transparent geometry to be rendered more efficiently, using 1 pass instead of 2. */
  MrtTransparency = "mrt transparency",
  /** This feature allows picking to occur more efficiently, using 1 pass instead of 3. */
  MrtPick = "mrt pick",
  /** This feature ensures large meshes (with more than 21,845 triangles) can be rendered. */
  UintElementIndex = "uint element index",
  /** This feature allows transparency to achieve the optimal quality. Without this feature, overlapping transparent geometry will "wash out" more easily. */
  FloatRendering = "float rendering",
  /** This feature allows for the display of non-3D classification data and solar shadows. */
  DepthTexture = "depth texture",
  /** This feature allows instancing of repeated geometry, which can reduce memory consumption. */
  Instancing = "instancing",
  /** This feature indicates that the system has enough texture units available for the shaders to run properly. */
  MinimalTextureUnits = "minimal texture units",
  /** Indicates that shadow maps are supported. Without this feature, shadows cannot be displayed. */
  ShadowMaps = "shadow maps",
  /** This feature allows a logarithmic depth buffer to be used. Without this feature, z-fighting will be much more likely to occur. */
  FragDepth = "fragment depth",
  /** This feature allows the renderer to achieve accurate contour lines for isoline and stepped delimiter modes of thematic display. */
  StandardDerivatives = "standard derivatives",
  /** This feature allows the renderer to smooth curved lines. */
  AntiAliasing = "anti-aliasing",
}

/** An enumeration that describes a general "compatibility rating" based on the contents of a [[WebGLRenderCompatibilityInfo]].
 * @public
 */
export enum WebGLRenderCompatibilityStatus {
  /**
   * Signifies that everything is ideal: context created successfully, all required and optional features are available,
   * and browser did not signal a major performance caveat.
   */
  AllOkay,
  /**
   * Signifies that the base requirements of compatibility are met but at least some optional features are missing.
   * Consult the contents of [[WebGLRenderCompatibilityInfo.missingOptionalFeatures]].
   */
  MissingOptionalFeatures,
  /**
   * Signifies that the base requirements of compatibility are met but WebGL reported a major performance caveat.  The browser
   * has likely fallen back to software rendering due to lack of a usable GPU.
   * Consult [[WebGLRenderCompatibilityInfo.contextErrorMessage]] for a possible description of what went wrong.
   * There could also be some missing optional features; consult the contents of [[WebGLRenderCompatibilityInfo.missingOptionalFeatures]].
   */
  MajorPerformanceCaveat,
  /**
   * Signifies that the base requirements of compatibility are not met; rendering cannot occur.
   * Consult the contents of [[WebGLRenderCompatibilityInfo.missingRequiredFeatures]].
   */
  MissingRequiredFeatures,
  /**
   * Signifies an inability to create either a canvas or a WebGL rendering context; rendering cannot occur.  Consult
   * [[WebGLRenderCompatibilityInfo.contextErrorMessage]] for a possible description of what went wrong.
   */
  CannotCreateContext,
}

/** Known bugs associated with specific graphics drivers for which iTwin.js can apply workarounds to produce correct visualization.
 * An instance of this object will exist on the [[WebGLRenderCompatibilityInfo]] object returned by [[queryRenderCompatibility]].
 * @see [[WebGLRenderCompatibilityInfo]]
 * @public
 */
export interface GraphicsDriverBugs {
  /** If true, the graphics driver inappropriately applies the "early Z" optimization when a fragment shader writes to the depth buffer.
   * Early Z elides execution of the fragment shader if the depth test fails; but if the fragment shader contains code that can alter the depth, it
   * must be executed. The primary symptom of this bug is transparent geometry appearing to be behind opaque geometry despite actually being in front of it.
   *
   * Affects Intel HD/UHD Graphics 620/630.
   *
   * The workaround for this bug has minimal impact on performance and no impact on visual fidelity.
   */
  fragDepthDoesNotDisableEarlyZ?: true;
  /** If true, the graphics driver will hang when applying MSAA to a viewport.
   *
   * Known to affect certain mobile Mali chipsets (G71 and G76). May affect more.
   *
   * The workaround for this bug means MSAA cannot be enabled on those devices.
   */
  msaaWillHang?: true;
}

/** Describes the level of compatibility of a client device/browser with the iTwin.js rendering system.
 * @public
 */
export interface WebGLRenderCompatibilityInfo {
  /** Describes the overall status of rendering compatibility. */
  status: WebGLRenderCompatibilityStatus;
  /** Features that are required by the rendering system but not supported by the client. */
  missingRequiredFeatures: WebGLFeature[];
  /** Optional features unsupported by this client that would provide improved performance or quality if present. */
  missingOptionalFeatures: WebGLFeature[];
  /** Known bugs associated with the client's graphics driver for which iTwin.js can apply workarounds. */
  driverBugs: GraphicsDriverBugs;
  /** The user agent as reported by the browser. */
  userAgent: string;
  /** The renderer string reported by this client's graphics driver. */
  unmaskedRenderer?: string;
  /** The vendor string reported by this client's graphics driver. */
  unmaskedVendor?: string;
  /** If true, there is a likelihood that integrated graphics are being used. This can be used to warn users on systems with both integrated graphics and dedicated graphics that they should try to switch to their dedicated graphics for better performance.
   * @note This property has the possibility of providing false positives and negatives. A user should use this property mainly as a hint and manually verify what graphics chip is being used.
   */
  usingIntegratedGraphics?: boolean;
  /** If WebGL context creation failed, an error message supplied by the browser. */
  contextErrorMessage?: string;
  /** The WebGL context created by the browser and used to generate the compatibility report. */
  createdContext?: WebGLContext;
}

/** A function that creates and returns a WebGLContext given an HTMLCanvasElement, a boolean specifying whether to use WebGL2, and a WebGLContextAttributes object describing the desired context attributes.
 * @public
 */
export type ContextCreator = (canvas: HTMLCanvasElement, useWebGL2: boolean, inputContextAttributes?: WebGLContextAttributes) => WebGLContext | undefined;

function createDefaultContext(canvas: HTMLCanvasElement, useWebGL2: boolean = true, attributes?: WebGLContextAttributes): WebGLContext | undefined {
  let context = useWebGL2 ? canvas.getContext("webgl2", attributes) : canvas.getContext("webgl", attributes);
  if (context === null && useWebGL2)
    context = canvas.getContext("webgl", attributes);
  return context ?? undefined;
}

/** This function returns information about the client system's level of compatibility with the iTwin.js rendering system, describing the client system's support for both optional and required features. It will also report if there is a major issue with the client system such as the browser falling back to software rendering or an inability to create a either a canvas or a WebGL rendering context.
 * @param useWebGL2 A boolean which will be passed to the createContext function in order to create the desired type of context; set this to `true` to use WebGL2, `false` to use WebGL1.
 * @param createContext A function of type [[ContextCreator]] that returns a WebGLContext. If not specified, this by default uses `canvas.getContext()` to create the WebGLContext.
 * @returns A [[WebGLRenderCompatibilityInfo]] object which contains a compatibility summary.
 * @see [[WebGLRenderCompatibilityInfo]]
 * @public
 */
export function queryRenderCompatibility(useWebGL2: boolean, createContext?: ContextCreator): WebGLRenderCompatibilityInfo {
  const canvas = document.createElement("canvas");
  if (null === canvas)
    return { status: WebGLRenderCompatibilityStatus.CannotCreateContext, missingOptionalFeatures: [], missingRequiredFeatures: [], userAgent: navigator.userAgent, driverBugs: { } };

  let errorMessage: string | undefined;
  canvas.addEventListener("webglcontextcreationerror", (event) => {
    errorMessage = (event as WebGLContextEvent).statusMessage || "webglcontextcreationerror was triggered with no error provided";
  }, false);

  if (undefined === createContext)
    createContext = createDefaultContext;

  let hasMajorPerformanceCaveat = false;
  let context = createContext(canvas, useWebGL2, { failIfMajorPerformanceCaveat: true });
  if (undefined === context) {
    hasMajorPerformanceCaveat = true;
    context = createContext(canvas, useWebGL2); // try to create context without black-listed GPU
    if (undefined === context)
      return {
        status: WebGLRenderCompatibilityStatus.CannotCreateContext,
        missingOptionalFeatures: [],
        missingRequiredFeatures: [],
        userAgent: navigator.userAgent,
        contextErrorMessage: errorMessage,
        driverBugs: {},
      };
  }

  const capabilities = new Capabilities();
  const compatibility = capabilities.init(context, undefined);
  compatibility.contextErrorMessage = errorMessage;

  if (hasMajorPerformanceCaveat && compatibility.status !== WebGLRenderCompatibilityStatus.MissingRequiredFeatures)
    compatibility.status = WebGLRenderCompatibilityStatus.MajorPerformanceCaveat;

  return compatibility;
}
