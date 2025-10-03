declare module 'd3-hierarchy' {
  export interface HierarchyNode<T> {
    data: T;
    x: number;
    y: number;
    depth: number;
    parent?: HierarchyNode<T> | null;
    children?: Array<HierarchyNode<T>>;
    descendants(): Array<HierarchyNode<T>>;
    links(): Array<{ source: HierarchyNode<T>; target: HierarchyNode<T> }>;
  }

  export function hierarchy<T>(data: T): HierarchyNode<T>;

  export function tree<T>(): {
    size(size: [number, number]): any;
    separation(sep: (a: HierarchyNode<T>, b: HierarchyNode<T>) => number): any;
    (root: HierarchyNode<T>): HierarchyNode<T>;
  };
}


