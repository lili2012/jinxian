/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/

import { ECObjectsError, ECObjectsStatus } from "./Exception";
import { SchemaKey, SchemaMatchType, SchemaItemKey } from "./ECObjects";
import Schema, { MutableSchema } from "./Metadata/Schema";
import SchemaItem from "./Metadata/SchemaItem";

export class SchemaMap extends Array<Schema> { }

/**
 * The interface defines what is needed to be a ISchemaLocater, which are used in a SchemaContext.
 */
export interface ISchemaLocater {
  getSchema<T extends Schema>(schemaKey: SchemaKey, matchType: SchemaMatchType): Promise<T | undefined>;
}

export interface ISchemaItemLocater {
  getSchemaItem<T extends SchemaItem>(schemaItemKey: SchemaItemKey): Promise<T | undefined>;
}

/**
 *
 */
export class SchemaCache implements ISchemaLocater {
  private _schema: SchemaMap;

  constructor() {
    this._schema = new SchemaMap();
  }

  get count() { return this._schema.length; }

  /**
   * Adds a schema to the cache. Does not allow for duplicate schemas, checks using SchemaMatchType.Latest.
   * @param schema The schema to add to the cache.
   */
  public async addSchema<T extends Schema>(schema: T) {
    if (await this.getSchema<T>(schema.schemaKey))
      return Promise.reject(new ECObjectsError(ECObjectsStatus.DuplicateSchema, `The schema, ${schema.schemaKey.toString()}, already exists within this cache.`));

    this._schema.push(schema);
    return Promise.resolve();
  }

  /**
   * Adds a schema to the cache. Does not allow for duplicate schemas, checks using SchemaMatchType.Latest.
   * @param schema The schema to add to the cache.
   */
  public addSchemaSync<T extends Schema>(schema: T) {
    if (this.getSchemaSync<T>(schema.schemaKey))
      throw new ECObjectsError(ECObjectsStatus.DuplicateSchema, `The schema, ${schema.schemaKey.toString()}, already exists within this cache.`);

    this._schema.push(schema);
  }

  /**
   * Gets the schema which matches the provided SchemaKey.
   * @param schemaKey The SchemaKey describing the schema to get from the cache.
   * @param matchType The match type to use when locating the schema
   */
  public async getSchema<T extends Schema>(schemaKey: SchemaKey, matchType: SchemaMatchType = SchemaMatchType.Latest): Promise<T | undefined> {
    if (this.count === 0)
      return undefined;

    const findFunc = (schema: Schema) => {
      return schema.schemaKey.matches(schemaKey, matchType);
    };

    const foundSchema = this._schema.find(findFunc);

    if (!foundSchema)
      return undefined;

    return foundSchema as T;
  }

  /**
   *
   * @param schemaKey
   * @param matchType
   */
  public getSchemaSync<T extends Schema>(schemaKey: SchemaKey, matchType: SchemaMatchType = SchemaMatchType.Latest): T | undefined {
    if (this.count === 0)
      return undefined;

    const findFunc = (schema: Schema) => {
      return schema.schemaKey.matches(schemaKey, matchType);
    };

    const foundSchema = this._schema.find(findFunc);

    if (!foundSchema)
      return foundSchema;

    return foundSchema as T;
  }

  /**
   * Removes the schema which matches the provided SchemaKey.
   * @param schemaKey The schema key of the schema to remove.
   */
  public async removeSchema(schemaKey: SchemaKey, matchType: SchemaMatchType = SchemaMatchType.Latest): Promise<void> {
    const findFunc = (schema: Schema) => {
      return schema.schemaKey.matches(schemaKey, matchType);
    };

    const indx = this._schema.findIndex(findFunc);
    if (indx < 0)
      return Promise.reject("");

    this._schema.splice(indx, 1);
    return;
  }

  /**
   * Removes the schema which matches the provided SchemaKey.
   * @param schemaKey The schema key of the schema to remove.
   * @param matchType
   */
  public removeSchemaSync(schemaKey: SchemaKey, matchType: SchemaMatchType = SchemaMatchType.Latest) {
    const findFunc = (schema: Schema) => {
      return schema.schemaKey.matches(schemaKey, matchType);
    };

    const indx = this._schema.findIndex(findFunc);
    if (indx < 0)
      return;

    this._schema.splice(indx, 1);
  }
}

/**
 * The SchemaContext, context object is used to facilitate schema and schema item location.
 *
 * The context controls the lifetime of each schema that it knows about. It has to be explicitly removed from the context in order to delete a schema object.
 *
 * The context is made up of a group of Schema Locators.
 */
export class SchemaContext implements ISchemaLocater, ISchemaItemLocater {
  private _locaters: ISchemaLocater[];

  private knownSchemas: SchemaCache;

  constructor() {
    this._locaters = [];

    this.knownSchemas = new SchemaCache();
    this._locaters.push(this.knownSchemas);
  }

  public addLocater(locater: ISchemaLocater) {
    this._locaters.push(locater);
  }

  /**
   * Adds the schema to this context
   * @param schema The schema to add to this context
   */
  public async addSchema(schema: Schema) {
    this.knownSchemas.addSchemaSync(schema);
  }

  /**
   * Adds the given SchemaItem to the the SchemaContext by locating the schema, with the best match of SchemaMatchType.Exact, and
   * @param schemaItem The SchemaItem to add
   */
  public async addSchemaItem(schemaItem: SchemaItem) {
    const schema = await this.getSchema(schemaItem.key.schemaKey, SchemaMatchType.Exact);
    if (!schema)
      throw new ECObjectsError(ECObjectsStatus.UnableToLocateSchema, `Unable to add the schema item ${schemaItem.name} to the schema ${schemaItem.key.schemaKey.toString()} because the schema could not be located.`);

    await (schema as MutableSchema).addItem(schemaItem);
    return;
  }

  /**
   *
   * @param schemaKey
   */
  public async getSchema<T extends Schema>(schemaKey: SchemaKey, matchType: SchemaMatchType = SchemaMatchType.Latest): Promise<T | undefined> {
    for (const locater of this._locaters) {
      const schema = await locater.getSchema<T>(schemaKey, matchType);
      if (schema)
        return schema;
    }

    return undefined;
  }

  public async getSchemaItem<T extends SchemaItem>(schemaItemKey: SchemaItemKey): Promise<T | undefined> {
    const schema = await this.getSchema(schemaItemKey.schemaKey, SchemaMatchType.Latest);
    if (!schema)
      return undefined;

    return schema.getItem<T>(schemaItemKey.name, false);
  }
}
