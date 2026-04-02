import TestPlatform from './test_platform'
import { MobileSQLiteStorage } from './storages'

export default class MobilePlatform extends TestPlatform {
  public type = 'mobile' as const

  private storage = new MobileSQLiteStorage()

  public getStorageType(): string {
    return this.storage.getStorageType()
  }

  public async setStoreValue(key: string, value: any): Promise<void> {
    return this.storage.setStoreValue(key, value)
  }

  public async getStoreValue(key: string): Promise<any> {
    return this.storage.getStoreValue(key)
  }

  public async delStoreValue(key: string): Promise<void> {
    return this.storage.delStoreValue(key)
  }

  public async getAllStoreValues(): Promise<{ [key: string]: any }> {
    return this.storage.getAllStoreValues()
  }

  public async getAllStoreKeys(): Promise<string[]> {
    return this.storage.getAllStoreKeys()
  }

  public async setAllStoreValues(data: { [key: string]: any }): Promise<void> {
    return this.storage.setAllStoreValues(data)
  }
}
