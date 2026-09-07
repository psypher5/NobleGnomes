import * as THREE from 'three';

/**
 * Creates clusters of reeds and cattails along the pond banks
 * with animated wind sway.
 */
export class Reeds {
  constructor(pondRadius = 40, clusters = 20) {
    this.group = new THREE.Group();
    this.stalks = [];

    this.createReeds(pondRadius, clusters);
  }

  createReeds(pondRadius, clusters) {
    // Shared materials
    const stalkMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c36,
      roughness: 0.65,
      flatShading: true
    });

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x588c3a,
      roughness: 0.6,
      side: THREE.DoubleSide,
      flatShading: true
    });

    const headMat = new THREE.MeshStandardMaterial({
      color: 0x422617, // Rich velvety chocolate brown
      roughness: 0.95,
      flatShading: true
    });

    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xa89360, // Dried straw staminate spike
      roughness: 0.8
    });

    // 1. Slender reed stalk
    const stalkGeo = new THREE.CylinderGeometry(0.035, 0.07, 4.2, 5);
    stalkGeo.translate(0, 2.1, 0);

    // 2. Velvety cattail head with rounded caps
    const headGeo = new THREE.CylinderGeometry(0.13, 0.13, 1.15, 8);
    headGeo.translate(0, 3.3, 0);

    // 3. Dry straw staminate tip spike
    const spikeGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.6, 4);
    spikeGeo.translate(0, 4.15, 0);

    // 4. Arching slender ribbon leaf geometry
    const leafGeo = new THREE.BufferGeometry();
    const leafVerts = [];
    const leafIndices = [];
    const leafSegs = 5;
    for (let s = 0; s <= leafSegs; s++) {
      const t = s / leafSegs;
      const y = t * 3.4;
      const curve = Math.pow(t, 2.2) * 0.45; // Graceful arch outward
      const w = Math.sin(t * Math.PI) * 0.09 + 0.015; // Widest in mid-blade
      leafVerts.push(-w, y, curve);
      leafVerts.push(w, y, curve);
    }
    for (let s = 0; s < leafSegs; s++) {
      const b = s * 2;
      leafIndices.push(b, b + 1, b + 2);
      leafIndices.push(b + 1, b + 3, b + 2);
    }
    leafGeo.setAttribute('position', new THREE.Float32BufferAttribute(leafVerts, 3));
    leafGeo.setIndex(leafIndices);
    leafGeo.computeVertexNormals();

    for (let c = 0; c < clusters; c++) {
      const clusterAngle = (c / clusters) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const clusterDist = pondRadius - 1.5 + (Math.random() - 0.5) * 3.2;
      const cx = Math.cos(clusterAngle) * clusterDist;
      const cz = Math.sin(clusterAngle) * clusterDist;

      const reedsPerCluster = 7 + Math.floor(Math.random() * 8);

      for (let r = 0; r < reedsPerCluster; r++) {
        const stalkGroup = new THREE.Group();
        const offsetX = (Math.random() - 0.5) * 2.4;
        const offsetZ = (Math.random() - 0.5) * 2.4;
        stalkGroup.position.set(cx + offsetX, -0.35, cz + offsetZ);

        const heightScale = 0.75 + Math.random() * 0.55;
        stalkGroup.scale.set(heightScale, heightScale, heightScale);

        // Central stalk
        const stalkMesh = new THREE.Mesh(stalkGeo, stalkMat);
        stalkMesh.castShadow = true;
        stalkGroup.add(stalkMesh);

        // Arching slender leaves around base
        const leafCount = 2 + Math.floor(Math.random() * 3);
        for (let l = 0; l < leafCount; l++) {
          const leafMesh = new THREE.Mesh(leafGeo, leafMat);
          leafMesh.rotation.y = (l / leafCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          leafMesh.scale.set(0.9 + Math.random() * 0.3, 0.8 + Math.random() * 0.4, 0.9 + Math.random() * 0.3);
          stalkGroup.add(leafMesh);
        }

        // Cattail head & dry spike on majority of stalks
        if (Math.random() > 0.35) {
          const headMesh = new THREE.Mesh(headGeo, headMat);
          headMesh.castShadow = true;
          stalkGroup.add(headMesh);

          const spikeMesh = new THREE.Mesh(spikeGeo, spikeMat);
          stalkGroup.add(spikeMesh);
        }

        stalkGroup.rotation.y = Math.random() * Math.PI * 2;
        stalkGroup.rotation.z = (Math.random() - 0.5) * 0.12;

        this.group.add(stalkGroup);

        this.stalks.push({
          group: stalkGroup,
          baseRotZ: stalkGroup.rotation.z,
          baseRotX: (Math.random() - 0.5) * 0.1,
          windOffset: Math.random() * Math.PI * 2,
          flexibility: 0.07 + Math.random() * 0.06
        });
      }
    }
  }

  update(time) {
    // Gentle natural wind swaying
    const wind = Math.sin(time * 2.0) * 0.6 + Math.cos(time * 0.8) * 0.4;

    for (const stalk of this.stalks) {
      const localWind = Math.sin(time * 2.5 + stalk.windOffset) * stalk.flexibility;
      stalk.group.rotation.z = stalk.baseRotZ + (wind * 0.05 + localWind);
      stalk.group.rotation.x = stalk.baseRotX + Math.cos(time * 1.8 + stalk.windOffset) * 0.03;
    }
  }
}
