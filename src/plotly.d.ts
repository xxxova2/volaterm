declare module 'plotly.js-dist-min' {
  import * as Plotly from 'plotly.js';
  export default Plotly;
}

declare module 'react-plotly.js' {
  import * as Plotly from 'plotly.js';
  import { Component } from 'react';

  interface PlotParams {
    data: Plotly.Data[];
    layout?: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    frames?: Plotly.Frame[];
    onInitialized?: (figure: object, graphDiv: HTMLDivElement) => void;
    onUpdate?: (figure: object, graphDiv: HTMLDivElement) => void;
    onPurge?: (figure: object, graphDiv: HTMLDivElement) => void;
    onError?: (err: Error) => void;
    onClick?: (event: Plotly.PlotMouseEvent) => void;
    onHover?: (event: Plotly.PlotMouseEvent) => void;
    onSelected?: (event: Plotly.PlotSelectionEvent) => void;
    className?: string;
    style?: React.CSSProperties;
    divId?: string;
    useResizeHandler?: boolean;
    revision?: number;
  }

  export default class Plot extends Component<PlotParams> {}
}
