import { RequestHandler } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { sanitize, Trim } from 'class-sanitizer';
import { StatusCodes } from './../common/status-codes';

export function dtoValidation(type: any, skipMissingProperties = false): RequestHandler {
  return (req, res, next) => {
    const dtoObj = plainToInstance(type, req.body);
    validate(dtoObj, { skipMissingProperties }).then((errors: ValidationError[]) => {
      if (errors.length > 0) {
        next(errors);
      } else {
        //sanitize the object and call the next middleware
        sanitize(dtoObj);
        req.body = dtoObj;
        next();
      }
    });
  };
}

// This middleware handles the case where our validation
// middleware says the request failed validation. We return
// those errors to the client here.
export function validationError(errors: Error, req, res, next) {
  if (errors instanceof Array && errors[0] instanceof ValidationError) {
    const dtoErrors = errors.map((error: ValidationError) => {
      return (Object as any).values(error.constraints);
    });

    res
      .status(StatusCodes.BAD_REQUEST)
      .json({
        statusCode: StatusCodes.BAD_REQUEST,
        errors: dtoErrors,
      })
      .end();
  } else {
    next(errors);
  }
}
