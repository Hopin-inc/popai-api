import { Service } from "typedi";
import { IsNull, Repository } from "typeorm";

import Todo from "@/entities/Todo";
import TodoSection from "@/entities/TodoSection";

import { toJapanDateTime } from "@/utils/common";
import AppDataSource from "@/config/data-source";
import { ITodo, ISection, ITodoSection, ITodoSectionUpdate } from "@/types";

@Service()
export default class TodoSectionRepository {
  private todoSectionRepository: Repository<TodoSection>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.todoSectionRepository = AppDataSource.getRepository(TodoSection);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  updateTodoSection = async (todo: ITodo, sections: ISection[]): Promise<void> => {
    const todoSections: ITodoSection[] = await this.todoSectionRepository.findBy({
      todo_id: todo.id,
      deleted_at: IsNull(),
    });

    const todoSectionIds: number[] = todoSections.map((s) => s.section_id).filter(Number);
    const sectionIds: number[] = sections.map((s) => s.id).filter(Number);

    const differenceSectionIds = todoSectionIds
      .filter((x) => !sectionIds.includes(x))
      .concat(sectionIds.filter((x) => !todoSectionIds.includes(x)));

    if (differenceSectionIds.length) {
      const deletedTodoSections: ITodoSection[] = todoSections
        .filter(function(obj) {
          return differenceSectionIds.includes(obj.section_id);
        })
        .map((s) => {
          s.deleted_at = toJapanDateTime(new Date());
          return s;
        });

      if (deletedTodoSections.length) {
        // await this.todoUserRepository.delete(idTodoUsers);
        await this.todoSectionRepository.upsert(deletedTodoSections, []);
      }
    }
  };

  saveTodoSections = async (dataTodoSections: ITodoSectionUpdate[]): Promise<void> => {
    const todoSectionData: TodoSection[] = [];

    for (const dataTodoSection of dataTodoSections) {
      const todo: ITodo = await this.todoRepository.findOneBy({
        todoapp_reg_id: dataTodoSection.todoId,
      });

      if (todo) {
        for (const section of dataTodoSection.sections) {
          const todoSection: ITodoSection = await this.todoSectionRepository.findOneBy({
            todo_id: todo.id,
            section_id: section.id,
            deleted_at: IsNull(),
          });

          if (!todoSection) {
            const todoSectionRecord = new TodoSection();
            todoSectionRecord.todo_id = todo.id;
            todoSectionRecord.section_id = section.id;
            todoSectionData.push(todoSectionRecord);
          }
        }
      }
    }

    await this.todoSectionRepository.save(todoSectionData);
  };
}
