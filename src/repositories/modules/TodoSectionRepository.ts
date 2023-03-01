import { Service } from "typedi";
import { In, Repository } from "typeorm";

import Todo from "@/entities/transactions/Todo";
import TodoSection from "@/entities/transactions/TodoSection";
import Section from "@/entities/settings/Section";

import AppDataSource from "@/config/data-source";
import { extractArrayDifferences } from "@/utils/common";
import { ITodoSectionUpdate } from "@/types";

@Service()
export default class TodoSectionRepository {
  private todoSectionRepository: Repository<TodoSection>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.todoSectionRepository = AppDataSource.getRepository(TodoSection);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  public async updateTodoSection(todo: Todo, sections: Section[]): Promise<void> {
    const todoSections: TodoSection[] = await this.todoSectionRepository.find({
      where: { todo_id: todo.id },
      withDeleted: true,
    });

    const sectionIdsBefore: number[] = todoSections.filter(ts => !ts.deleted_at).map(ts => ts.section_id);
    const sectionIdsAfter: number[] = sections.map(section => section.id);
    const [addedSectionIds, deletedSectionIds] = extractArrayDifferences(sectionIdsAfter, sectionIdsBefore);

    const addedTodoSections: TodoSection[] = [];
    const restoredSectionIds: number[] = [];
    const deletedTodoSections = todoSections.filter(ts => deletedSectionIds.includes(ts.section_id));
    addedSectionIds.forEach(sectionId => {
      if (todoSections.filter(ts => ts.deleted_at).map(ts => ts.section_id).includes(sectionId)) {
        restoredSectionIds.push(sectionId);
      } else {
        addedTodoSections.push(new TodoSection(todo, sectionId));
      }
    });
    await Promise.all([
      this.todoSectionRepository.upsert(addedTodoSections, []),
      this.todoSectionRepository.restore({
        todo_id: todo.id,
        section_id: In(restoredSectionIds),
      }),
      this.todoSectionRepository.softRemove(deletedTodoSections),
    ]);
  }

  public async saveTodoSections(dataTodoSections: ITodoSectionUpdate[]): Promise<void> {
    const updatedTodoSections: TodoSection[] = [];
    const deletedTodoSections: TodoSection[] = [];
    await Promise.all(dataTodoSections.map(async dataTodoSection => {
      const todo: Todo = await this.todoRepository.findOneBy({
        todoapp_reg_id: dataTodoSection.todoId,
      });
      if (todo) {
        const savedTodoSections = await this.todoSectionRepository.find({
          where: { todo_id: todo.id },
          withDeleted: true,
        });
        const restoredSectionIds: number[] = [];
        dataTodoSection.sections.forEach(section => {
          if (!savedTodoSections.some(ts => ts.section_id === section.id)) {
            if (savedTodoSections.filter(ts => ts.deleted_at).some(ts => ts.section_id === section.id)) {
              restoredSectionIds.push(section.id);
            } else {
              updatedTodoSections.push(new TodoSection(todo, section));
            }
          }
        });
        savedTodoSections.filter(ts => !ts.deleted_at).forEach(savedTodoSection => {
          if (!dataTodoSection.sections.map(s => s.id).includes(savedTodoSection.section_id)) {
            deletedTodoSections.push(savedTodoSection);
          }
        });
        await this.todoSectionRepository.restore({
          todo_id: todo.id,
          section_id: In(restoredSectionIds),
        });
      }
    }));
    await Promise.all([
      this.todoSectionRepository.upsert(updatedTodoSections, []),
      this.todoSectionRepository.softRemove(deletedTodoSections),
    ]);
  }
}
