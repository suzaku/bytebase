import { isEmpty } from "lodash-es";

import {
  SqlEditorState,
  ConnectionAtom,
  QueryInfo,
  ConnectionContext,
  Database,
  DatabaseId,
  ProjectId,
} from "../../types";
import * as types from "../mutation-types";
import { makeActions } from "../actions";
import {
  parseSQL,
  transformSQL,
} from "../../components/MonacoEditor/sqlParser";

const state: () => SqlEditorState = () => ({
  connectionTree: [],
  connectionContext: {
    hasSlug: false,
    instanceId: 0,
    instanceName: "",
    databaseId: 0,
    databaseName: "",
    tableId: 0,
    tableName: "",
    isLoadingTree: false,
    selectedDatabaseId: 0,
    selectedTableName: "",
  },
  queryStatement: "",
  selectedStatement: "",
  isExecuting: false,
  queryResult: null,
  isShowExecutingHint: false,
});

const getters = {
  connectionTreeByInstanceId(state: SqlEditorState): Partial<ConnectionAtom> {
    const idx = state.connectionTree.findIndex((item) => {
      return item.id === state.connectionContext.instanceId;
    });

    return idx !== -1 ? state.connectionTree[idx] : {};
  },
  connectionInfo(
    state: SqlEditorState,
    getter: any,
    rootState: any,
    rootGetters: any
  ) {
    return {
      projectListById: rootState.project.projectById,
      instanceListById: rootState.instance.instanceById,
      databaseListByInstanceId: rootState.database.databaseListByInstanceId,
      databaseListByProjectId: rootState.database.databaseListByProjectId,
      tableListByDatabaseId: rootState.table.tableListByDatabaseId,
    };
  },
  connectionInfoByInstanceId(
    state: SqlEditorState,
    getter: any,
    rootState: any,
    rootGetters: any
  ) {
    let instance = {} as any;
    let databaseList = [];
    let tableList = [];

    if (!isEmpty(getter.connectionTreeByInstanceId)) {
      instance = getter.connectionTreeByInstanceId;
      databaseList = rootGetters["database/databaseListByInstanceId"](
        instance.id
      );

      tableList = instance.children
        .map((item: ConnectionAtom) =>
          rootGetters["table/tableListByDatabaseId"](item.id)
        )
        .flat();
    }

    return {
      instance,
      databaseList,
      tableList,
    };
  },
  findProjectIdByDatabaseId:
    (state: SqlEditorState, getter: any) =>
    (databaseId: DatabaseId): ProjectId => {
      let projectId = 1;
      const databaseListByProjectId =
        getter.connectionInfo.databaseListByProjectId;
      for (const [id, databaseList] of databaseListByProjectId) {
        const idx = databaseList.findIndex(
          (database: Database) => database.id === databaseId
        );
        if (idx !== -1) {
          projectId = id;
          break;
        }
      }
      return projectId;
    },
  currentSlug(state: SqlEditorState) {
    const connectionContext = state.connectionContext;
    return `${connectionContext.instanceId}/${connectionContext.databaseId}/${connectionContext.tableId}`;
  },
  isEmptyStatement(state: SqlEditorState) {
    return isEmpty(state.queryStatement);
  },
  parsedStatement(state: SqlEditorState) {
    const sqlStatement = state.selectedStatement || state.queryStatement;
    const { data } = parseSQL(sqlStatement);
    return data !== null ? transformSQL(data) : sqlStatement;
  },
};

const mutations = {
  [types.SET_SQL_EDITOR_STATE](
    state: SqlEditorState,
    payload: Partial<SqlEditorState>
  ) {
    Object.assign(state, payload);
  },
  [types.SET_CONNECTION_TREE](
    state: SqlEditorState,
    payload: ConnectionAtom[]
  ) {
    state.connectionTree = payload;
  },
  [types.SET_QUERY_RESULT](state: SqlEditorState, payload: Array<any>) {
    state.queryResult = payload;
  },
  [types.SET_CONNECTION_CONTEXT](
    state: SqlEditorState,
    payload: Partial<ConnectionContext>
  ) {
    Object.assign(state.connectionContext, payload);
  },
  [types.SET_IS_EXECUTING](state: SqlEditorState, payload: boolean) {
    state.isExecuting = payload;
  },
};

type SqlEditorActionsMap = {
  setSqlEditorState: typeof mutations.SET_SQL_EDITOR_STATE;
  setConnectionTree: typeof mutations.SET_CONNECTION_TREE;
  setQueryResult: typeof mutations.SET_QUERY_RESULT;
  setConnectionContext: typeof mutations.SET_CONNECTION_CONTEXT;
  setIsExecuting: typeof mutations.SET_IS_EXECUTING;
};

const actions = {
  ...makeActions<SqlEditorActionsMap>({
    setSqlEditorState: types.SET_SQL_EDITOR_STATE,
    setConnectionTree: types.SET_CONNECTION_TREE,
    setQueryResult: types.SET_QUERY_RESULT,
    setConnectionContext: types.SET_CONNECTION_CONTEXT,
    setIsExecuting: types.SET_IS_EXECUTING,
  }),
  async executeQuery(
    { commit, dispatch, state }: any,
    payload: Partial<QueryInfo> = {}
  ) {
    const res = await dispatch(
      "sql/query",
      {
        instanceId: state.connectionContext.instanceId,
        databaseName: state.connectionContext.databaseName,
        statement: !isEmpty(state.selectedStatement)
          ? state.selectedStatement
          : state.queryStatement,
        ...payload,
      },
      { root: true }
    );
    commit(types.SET_QUERY_RESULT, res.data);
    return res;
  },
  async fetchConnectionByInstanceIdAndDatabaseId(
    { commit, dispatch }: any,
    { instanceId, databaseId }: Partial<SqlEditorState["connectionContext"]>
  ) {
    const instanceInfo = await dispatch(
      "instance/fetchInstanceById",
      instanceId,
      { root: true }
    );
    const databaseInfo = await dispatch(
      "database/fetchDatabaseById",
      { databaseId },
      { root: true }
    );
    commit(types.SET_SQL_EDITOR_STATE, {
      queryResult: null,
    });
    commit(types.SET_CONNECTION_CONTEXT, {
      hasSlug: true,
      instanceId,
      instanceName: instanceInfo.name,
      databaseId,
      databaseName: databaseInfo.name,
    });
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
