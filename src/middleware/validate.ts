import { ValidationError } from "class-validator";

import { StatusCodes } from "@/common/StatusCodes";

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
