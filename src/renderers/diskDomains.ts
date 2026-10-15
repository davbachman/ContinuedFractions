import { rational } from "../math/rational";
import { triangulationMatrix, type Triangulation } from "../math/triangulation";
import {
  domainSectors,
  domainSectorSheets,
  domainSectorKeys,
} from "./torusDomains";
import { idealImage } from "./modularGeometry";
import {
  diskProjection,
  mappedDiskPoint,
  diskPolygon,
  diskGeodesic,
  type DiskCamera,
} from "./fareyDisk";

/** The same six half-domains used in H², mapped by the exact PSL(2,Z) chart. */
export function diskDomains(tri: Triangulation, camera: DiskCamera, lift = 0) {
  const m = triangulationMatrix(tri),
    projection = diskProjection(camera);
  const center = projection.point(
    mappedDiskPoint(m, rational(1n, 2n), rational(3n, 4n)),
  );
  const sheets = domainSectorSheets(m, lift);
  const keys = domainSectorKeys(m);
  return domainSectors.map((s, i) => {
    const midpoint = projection.point(
      mappedDiskPoint(
        m,
        rational(BigInt(s.midpoint.x * 2), 2n),
        rational(BigInt(s.midpoint.y ** 2 * 4), 4n),
      ),
    );
    const cusp = projection.vertex(idealImage(m, s.cusp));
    const line = (p: { x: number; y: number }) =>
      `M${center.x} ${center.y}` + diskGeodesic(center, p);
    return {
      key: keys[i],
      fill: diskPolygon([center, midpoint, cusp]),
      sheet: sheets[i],
      s: i % 2 === 0 ? line(midpoint) : undefined,
      t: [0, 1, 3].includes(i) ? line(cusp) : undefined,
    };
  });
}
