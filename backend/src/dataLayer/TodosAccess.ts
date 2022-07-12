import 'source-map-support/register'

import * as AWS from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
const AWSXRay = require('aws-xray-sdk')

import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'
import { createLogger } from '../utils/logger'

const logger = createLogger('todosAccess')

const XAWS = AWSXRay.captureAWS(AWS)

export class TodosAccess {

  constructor(
    private readonly docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient(),
    private readonly todosTable = process.env.TODO_TABLE,
    private readonly todosByUserIndex = process.env.TODOS_BY_USER_INDEX
  ) {}

  async todoItemExists(todoId: string): Promise<boolean> {
    const item = await this.getTodoItem(todoId)
    return !!item
  }

  async getTodoItem(userId: string): Promise<TodoItem[]> {
    logger.info(`Getting all todos for user ${userId} from ${this.todosTable}`)

    const result = await this.docClient.query({
      TableName: this.todosTable,
      IndexName: this.todosByUserIndex,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise()

    const items = result.Items

    logger.info(`Found ${items.length} todos for user ${userId} in ${this.todosTable}`)

    return items as TodoItem[]
  }

  async getTodoItems(userId: string, todoId: string): Promise<TodoItem> {
    logger.info('Getting a todo by Id', {userId, todoId})

    const result = await this.docClient.get({
      TableName: this.todosTable,
      Key: {
        userId,
        todoId
      }
    }).promise()

    const item = result.Item

    return item as TodoItem
  }

  async createTodoItem(todoItem: TodoItem) {
    logger.info(`Putting todo ${todoItem.todoId} into ${this.todosTable}`)

    await this.docClient.put({
      TableName: this.todosTable,
      Item: todoItem,
    }).promise()
  }

  async updateTodoItem(userId: string, todoId: string, todoUpdate: TodoUpdate) {
    logger.info(`Updating todo item ${todoId} in ${this.todosTable}`)

    await this.docClient.update({
      TableName: this.todosTable,
      Key: {
        userId,
        todoId
      },
      UpdateExpression: 'set #name = :name, dueDate = :dueDate, done = :done',
      ExpressionAttributeNames: {
        "#name": "name"
      },
      ExpressionAttributeValues: {
        ":name": todoUpdate.name,
        ":dueDate": todoUpdate.dueDate,
        ":done": todoUpdate.done
      }
    }).promise()   
  }

  async deleteTodoItem(userId: string, todoId: string) {
    logger.info(`Deleting todo item ${todoId} from ${this.todosTable}`)

    await this.docClient.delete({
      TableName: this.todosTable,
      Key: {
        userId,
        todoId
      }
    }).promise()    
  }

  async updateAttachmentUrl(userId: string, todoId: string, attachmentUrl: string) {
    logger.info(`Updating attachment URL for todo ${todoId} in ${this.todosTable}`)

    await this.docClient.update({
      TableName: this.todosTable,
      Key: {
        userId,
        todoId
      },
      UpdateExpression: 'set attachmentUrl = :attachmentUrl',
      ExpressionAttributeValues: {
        ':attachmentUrl': attachmentUrl
      }
    }).promise()
  }

}
