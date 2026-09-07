import * as THREE from 'three';

/**
 * Deep memory disposal traversal routine from Three.js production skill standards.
 * Disposes geometries, materials, and attached textures to prevent GPU buffer leaks.
 */
export function disposeHierarchy(rootObject) {
  if (!rootObject) return;

  rootObject.traverse((obj) => {
    // 1. Geometry
    if (obj.geometry) {
      obj.geometry.dispose();
    }

    // 2. Material(s) and associated textures
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        for (const key of Object.keys(mat)) {
          const value = mat[key];
          if (value && typeof value === 'object' && value.isTexture) {
            value.dispose();
          }
        }
        mat.dispose();
      }
    }
  });

  // Remove direct children
  while (rootObject.children && rootObject.children.length > 0) {
    const child = rootObject.children[0];
    rootObject.remove(child);
  }
}
