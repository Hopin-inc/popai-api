import { FindOptionsWhere, In, Repository } from "typeorm";
import { extractArrayDifferences } from "@/utils/array";

export const updateCrossRefTable = async <
  ParentEntity extends Record<PropertyKey, any>
    & Record<"id", any>
    & Record<"deletedAt", Date | undefined>,
  ChildEntity extends Record<PropertyKey, any>
    & Record<"id", any>
    & Record<"deletedAt", Date | undefined>,
  ParentKey extends ParentEntity["id"] & keyof CrossEntity,
  ChildKey extends ChildEntity["id"] & keyof CrossEntity,
  CrossEntity extends Record<ParentKey, ParentEntity["id"]>
    & Record<ChildKey, ChildEntity["id"]>
    & Record<"deletedAt", Date | undefined>,
>(
  repository: Repository<CrossEntity>,
  crossEntity: new (p: any, c: any, ...args: any[]) => CrossEntity,
  parent: ParentEntity,
  children: ChildEntity[],
  parentKey: ParentKey,
  childKey: ChildKey,
): Promise<void> => {
  const crossItemsWithDeleted: CrossEntity[] = await repository.find({
    where: { [parentKey]: parent.id },
    withDeleted: true,
  });
  const childIdsBefore = crossItemsWithDeleted
    .filter(crossItem => !crossItem.deletedAt)
    .map(crossItem => crossItem[childKey]);
  const childIdsAfter = children.map(child => child.id);
  const [addedOrRestoredIds, deletedIds] = extractArrayDifferences(childIdsAfter, childIdsBefore);

  const addedIds: ChildEntity["id"][] = [];
  const restoredIds: ChildEntity["id"][] = [];
  const deletedItems = crossItemsWithDeleted
    .filter(crossItem => deletedIds.includes(crossItem[childKey]));
  addedOrRestoredIds.forEach(id => {
    if (
      crossItemsWithDeleted
        .filter(crossItem => crossItem.deletedAt)
        .map(crossItem => crossItem[childKey])
        .includes(id)
    ) {
      restoredIds.push(id);
    } else {
      addedIds.push(id);
    }
  });
  const addedItems = addedIds.map(userId => new crossEntity(parent.id, userId));
  await Promise.all([
    repository.upsert(addedItems, []),
    repository.restore(<FindOptionsWhere<CrossEntity>>{
      [parentKey]: parent.id,
      [childKey]: In(restoredIds),
    }),
    repository.softRemove(deletedItems),
  ]);
};

export const saveRelationsInCrossRefTable = async <
  ParentEntity extends Record<PropertyKey, any>
    & Record<"id", any>
    & Record<"deletedAt", Date | undefined>,
  ChildEntity extends Record<PropertyKey, any>
    & Record<"id", any>
    & Record<"deletedAt", Date | undefined>,
  ParentKey extends ParentEntity["id"] & keyof CrossEntity,
  ChildKey extends ChildEntity["id"] & keyof CrossEntity,
  CrossEntity extends Record<ParentKey, ParentEntity["id"]>
    & Record<ChildKey, ChildEntity["id"]>
    & Record<"deletedAt", Date | undefined>,
>(
  repository: Repository<CrossEntity>,
  crossEntity: new (
    parent: ParentEntity | ParentEntity["id"],
    child: ChildEntity | ChildEntity["id"],
    ...args: any[]
  ) => CrossEntity,
  data: {
    parentId: ParentEntity["id"],
    currentChildIds: ChildEntity["id"][],
    children: ChildEntity[],
  }[],
  parentKey: ParentKey,
  childKey: ChildKey,
): Promise<void> => {
  const updatedItems: CrossEntity[] = [];
  const deletedItems: CrossEntity[] = [];
  data.forEach(record => {
    const { parentId, currentChildIds, children } = record;
    children.forEach(child => {
      const item = new crossEntity(parentId, child.id);
      item.deletedAt = null;
      updatedItems.push(item);
    });
    currentChildIds.forEach(childId => {
      if (!children.map(child => child.id).includes(childId)) {
        deletedItems.push(new crossEntity(parentId, childId));
      }
    });
  });
  await Promise.all([
    repository.upsert(updatedItems, [parentKey, childKey]),
    repository.softRemove(deletedItems),
  ]);
};
