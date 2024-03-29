import express, { Request, Response } from 'express'
import { Constants } from '../../../constants'
import { AddListRequest } from '../../../entities/add-list.request.entity'
import { DeleteListRequest } from '../../../entities/delete-list.request.entity'
import { JwtPayload } from '../../../entities/jwtpayload.entity'
import { UpdateListRequest } from '../../../entities/update-list.request.entity'
import ListController from '../../../modules/list/list.controller'
import { body, query, validationResult } from 'express-validator'

const router = express.Router()
const listController = new ListController()

router.post(
  '/',
  [
    body('title')
      .isString()
      .withMessage(Constants.ERROR_MESSAGES.TITLE_REQUIRED),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res
        .status(Constants.HTTP_CODES.BAD_REQUEST)
        .json({ errors: errors.array() })
    }
    try {
      const { title, jwtPayload }: AddListRequest = req.body
      const response = await listController.addToList({
        title,
        username: jwtPayload.username,
      })
      return res.status(Constants.HTTP_CODES.CREATED).json(response![0])
    } catch (err: any) {
      return res.status(Constants.HTTP_CODES.INTERNAL_SERVER_ERROR).json({
        message: err?.message,
        code: err?.code,
      })
    }
  }
)

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      jwtPayload,
    }: {
      jwtPayload: JwtPayload
    } = req.body
    const { username } = jwtPayload
    const response = await listController.getList({ username })
    res.json(response)
  } catch (err: any) {
    return res.status(Constants.HTTP_CODES.INTERNAL_SERVER_ERROR).json({
      message: err?.message,
      code: err?.code,
    })
  }
})

router.patch(
  '/',
  [
    body('title')
      .isString()
      .withMessage(Constants.ERROR_MESSAGES.TITLE_REQUIRED),
    body('isDone')
      .isBoolean()
      .withMessage(Constants.ERROR_MESSAGES.IS_DONE_REQUIRED),
    body('toDoListId')
      .isString()
      .withMessage(Constants.ERROR_MESSAGES.TO_DO_LIST_ID_REQUIRED),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res
        .status(Constants.HTTP_CODES.BAD_REQUEST)
        .json({ errors: errors.array() })
    }
    try {
      const { jwtPayload, title, isDone, toDoListId }: UpdateListRequest =
        req.body
      const { username } = jwtPayload
      const response = await listController.updateList({
        username,
        title,
        isDone,
        toDoListId,
      })
      res
        .status(
          response.modifiedCount === 0
            ? Constants.HTTP_CODES.NOT_MODIFIED
            : Constants.HTTP_CODES.OK
        )
        .json(response)
    } catch (err: any) {
      return res.status(Constants.HTTP_CODES.INTERNAL_SERVER_ERROR).json({
        message: err?.message,
        code: err?.code,
      })
    }
  }
)

router.delete(
  '/',
  [
    query('toDoListId').custom((value, { req }) => {
      if (req?.query?.flag === 'DELETE_ONE' && !value) {
        throw new Error(Constants.ERROR_MESSAGES.TO_DO_LIST_ID_REQUIRED)
      }
      return true
    }),
    query('flag')
      .isIn(['DELETE_ALL', 'DELETE_ONE'])
      .withMessage(Constants.ERROR_MESSAGES.FLAG_MUST_BE),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res
        .status(Constants.HTTP_CODES.BAD_REQUEST)
        .json({ errors: errors.array() })
    }
    try {
      const jwtPayload: DeleteListRequest['jwtPayload'] = req.body.jwtPayload
      const { username } = jwtPayload
      const { toDoListId, flag } = req.query
      const response = await listController.deleteList({
        username,
        toDoListId: toDoListId as DeleteListRequest['toDoListId'],
        flag: flag as DeleteListRequest['flag'],
      })
      if (!response)
        res.status(Constants.HTTP_CODES.NOT_FOUND).json({
          message: Constants.ERROR_MESSAGES.TO_DO_LIST_ID_NOT_FOUND,
        })
      else res.json(response)
    } catch (err: any) {
      return res.status(Constants.HTTP_CODES.INTERNAL_SERVER_ERROR).json({
        message: err?.message,
        code: err?.code,
      })
    }
  }
)

export default router
