import { useEffect, useState } from "react";
import { type MyManagedResource, resourceManagerService } from "../services/resourceManagerService";

export function useMyResourceManagers() {
  const [resources, setResources] = useState<MyManagedResource[]>([]);

  useEffect(() => {
    resourceManagerService.listMy().then(setResources).catch(() => setResources([]));
  }, []);

  function isResourceManager(resourceType: string, resourceId: string): boolean {
    return resources.some((r) => r.resourceType === resourceType && r.resourceId === resourceId);
  }

  return { resources, isResourceManager };
}
