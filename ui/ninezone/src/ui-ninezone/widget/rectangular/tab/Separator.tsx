/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module Widget */

import * as classnames from "classnames";
import * as React from "react";
import { CommonProps, NoChildrenProps } from "@bentley/ui-core";
import "./Separator.scss";

/** Properties of [[TabSeparator]] component.
 * @alpha
 */
export interface TabSeparatorProps extends CommonProps, NoChildrenProps {
  readonly isHorizontal?: boolean;
}

/** Rectangular widget tab separator. Used in [[Stacked]] component.
 * @alpha
 */
export class TabSeparator extends React.PureComponent<TabSeparatorProps> {
  public render() {
    const className = classnames(
      "nz-widget-rectangular-tab-separator",
      this.props.isHorizontal && "nz-horizontal",
      this.props.className);

    return (
      <div
        className={className}
        style={this.props.style}
      />
    );
  }
}
