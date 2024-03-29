import mongoose, { UpdateWriteOpResult } from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import ListController from '../../../modules/list/list.controller'
import userModel, { User } from '../../../database/model/user.model'

let mongoServer: MongoMemoryServer
let listController: ListController

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()
  await mongoose.connect(mongoUri)
  listController = new ListController()
  await userModel.create({
    username: 'username',
    sub: 'sub',
    email: 'email',
  })
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

describe('addToList', () => {
  it("should add a to-do item to the user's to-do list", async () => {
    const mockObject = {
      title: 'title',
      username: 'username',
    }
    const addToListResponse = await listController.addToList(mockObject)
    expect(addToListResponse![0]).toMatchObject({
      title: mockObject.title,
      isDone: false,
    })
    const userResponse = await userModel
      .findOne({
        username: 'username',
      })
      .lean()
    const expectedUserResponse = {
      email: 'email',
      username: 'username',
      sub: 'sub',
      toDoList: [
        {
          title: 'title',
          isDone: false,
        },
      ],
    }
    expect(userResponse).toMatchObject(expectedUserResponse)
  })
})

describe('getList', () => {
  it('should return the user object with only toDoList property', async () => {
    const expectedToDoList = {
      title: 'title',
      isDone: false,
    }
    const expectedUserObject = new userModel({
      email: '_email',
      username: '_username',
      sub: '_sub',
      toDoList: [expectedToDoList],
    })
    await expectedUserObject.save()

    const mockUsername = '_username'
    const actualUserResponse = await listController.getList({
      username: mockUsername,
    })

    expect(actualUserResponse).toBeDefined()
    expect(actualUserResponse?.toDoList.length).toBe(1)
    expect(actualUserResponse?.toDoList[0]).toMatchObject(expectedToDoList)
  })

  it('should return null when the user is not found', async () => {
    const mockUsername = 'nonexistent_user'
    const actualUserResponse = await listController.getList({
      username: mockUsername,
    })

    expect(actualUserResponse).toBeNull()
  })
})

describe('updateList', () => {
  it('should update a task in the user to-do list', async () => {
    // Create a mock user in the database
    const mockUser = {
      email: 'test@test.com',
      username: 'testuser',
      sub: '1234567890',
      toDoList: [
        {
          title: 'Task 1',
          isDone: false,
        },
      ],
    }
    await userModel.create(mockUser)

    const mockTitle = 'Task 1'
    const mockIsDone = false

    const userResponse = await userModel.findOne({
      username: mockUser.username,
    })
    expect(userResponse?.toDoList[0].title).toEqual(mockTitle)
    expect(userResponse?.toDoList[0].isDone).toEqual(mockIsDone)
  })
  it('should throw an error when toDoListId does not exist', async () => {
    const mockUser = {
      username: 'mock_user',
      sub: 'test-sub',
      email: 'test-email',
      toDoList: [
        {
          title: 'Existing Title',
          isDone: false,
        },
      ],
    }
    await userModel.create(mockUser)

    const toDoListId = '641b1255e0128b5bad081a22'
    const update = await listController.updateList({
      username: mockUser.username,
      toDoListId,
      title: 'New Title',
      isDone: true,
    })
    const expectedUpdate = {
      acknowledged: true,
      modifiedCount: 0,
      upsertedId: null,
      upsertedCount: 0,
      matchedCount: 0,
    }
    expect(update).toStrictEqual(expectedUpdate)
  })
})

describe('deleteList', () => {
  let user: User
  beforeEach(async () => {
    const mockUser = {
      username: 'another_user',
      sub: 'another_sub',
      email: 'another_email',
      toDoList: [
        {
          title: 'Test Title',
          isDone: false,
        },
        {
          title: 'Test Title2',
          isDone: false,
        },
      ],
    }
    user = await userModel.create(mockUser)
  })
  afterEach(async () => {
    await userModel.deleteMany({})
  })
  it('should delete a single item from the list when flag is DELETE_ONE', async () => {
    const result = await listController.deleteList({
      username: user.username,
      toDoListId: user.toDoList[0]._id,
      flag: 'DELETE_ONE',
    })
    const expectedResult = {
      acknowledged: true,
      modifiedCount: 1,
      upsertedId: null,
      upsertedCount: 0,
      matchedCount: 1,
    }
    expect(result).toMatchObject(expectedResult)
    const user2 = await userModel.findById(user._id)
    expect(user2?.toDoList.length).toBe(1)
  })

  it('should delete all items from the list when flag is DELETE_ALL', async () => {
    const result = await listController.deleteList({
      username: user.username,
      toDoListId: user.toDoList[0]._id,
      flag: 'DELETE_ALL',
    })
    const expectedResult = {
      acknowledged: true,
      modifiedCount: 1,
      upsertedId: null,
      upsertedCount: 0,
      matchedCount: 1,
    }
    expect(result).toMatchObject(expectedResult)
    const user2 = await userModel.findById(user._id)
    expect(user2?.toDoList.length).toBe(0)
  })
})
