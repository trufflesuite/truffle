export type HoverState = Record<
  | "overviewBackHovered"
  | "rejectButtonHovered"
  | "confirmButtonHovered"
  | "collapsedDetailsHovered",
  boolean
>;

export type DetailsView = "expanded" | "collapsed";
