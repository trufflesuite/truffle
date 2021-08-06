import { Cache } from "../Cache";

export class HasCache {
  protected cache: Cache;

  constructor() {
    this.cache = new Cache();
  }
}

export class AllowsLoadingSpecificVersion {
  allowsLoadingSpecificVersion(): true {
    return true;
  }
}

export class ForbidsLoadingSpecificVersion {
  allowsLoadingSpecificVersion(): false {
    return false;
  }
}

export class AllowsListingVersions {
  allowsListingVersions(): true {
    return true;
  }
}

export class ForbidsListingVersions {
  allowsListingVersions(): false {
    return false;
  }
}
