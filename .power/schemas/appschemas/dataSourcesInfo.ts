/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "mserp_hcmemployeev2entities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_hcmemployeev2entityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "sd_goodsreceipts": {
    "tableId": "",
    "version": "",
    "primaryKey": "sd_goodsreceiptid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_omlegalentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_omlegalentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_omoperatingunitentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_omoperatingunitentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_dirpersonentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_dirpersonentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_dirpersonnamecdrentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_dirpersonnamecdrentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_ecoresproductcategoryentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_ecoresproductcategoryentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_ecoresproductcategoryassignmententities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_ecoresproductcategoryassignmententityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_ecoresproductcategoryhierarchyroleentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_ecoresproductcategoryhierarchyroleentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_ecoresproductmastercolorentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_ecoresproductmastercolorentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_ecoresproductmasterconfigurationentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_ecoresproductmasterconfigurationentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_ecoresproductmastersizeentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_ecoresproductmastersizeentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_ecoresproductmasterstyleentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_ecoresproductmasterstyleentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_ecoresproductv2entities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_ecoresproductv2entityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_purchpurchaseorderheaderv2entities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_purchpurchaseorderheaderv2entityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_purchpurchaseorderlinev2entities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_purchpurchaseorderlinev2entityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_purchaserequisitionlinev2entities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_purchaserequisitionlinev2entityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_purchaserequisitionheaderv2entities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_purchaserequisitionheaderv2entityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_ecoresreleasedproductdocumentattachmententities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_ecoresreleasedproductdocumentattachmententityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_ecoresreleasedproductv2entities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_ecoresreleasedproductv2entityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "sd_requisitioncomments": {
    "tableId": "",
    "version": "",
    "primaryKey": "sd_requisitioncommentid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_inventoperationalsitev2entities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_inventoperationalsitev2entityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_dirpersonuserentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_dirpersonuserentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_inventwarehouseentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_inventwarehouseentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "mserp_hcmworkerentities": {
    "tableId": "",
    "version": "",
    "primaryKey": "mserp_hcmworkerentityid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "microsoftcopilotstudio": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "ExecuteCopilotAsyncV2": {
        "path": "/{connectionId}/powervirtualagents/dataverse-backed/authenticated/bots/{Copilot}/proactivecopilot/executeAsyncV2",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "x-ms-conversation-id",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "201": {
            "type": "void"
          },
          "default": {
            "type": "object"
          }
        }
      },
      "ExecuteCopilotAsync": {
        "path": "/{connectionId}/powervirtualagents/dataverse-backed/authenticated/bots/{Copilot}/proactivecopilot/executeAsync",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "x-ms-conversation-id",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "ExecuteCopilot": {
        "path": "/{connectionId}/powervirtualagents/dataverse-backed/authenticated/bots/{Copilot}/proactivecopilot/execute",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "x-ms-conversation-id",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "ListCopilots": {
        "path": "/{connectionId}/powervirtualagents/dataverse-backed/copilots",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "ExecuteDataverseCopilotToStart": {
        "path": "/{connectionId}/powervirtualagents/dataverse-backed/authenticated/bots/{Copilot}/conversations/{ConversationId}",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "ContinueExecuteDataverseCopilot": {
        "path": "/{connectionId}/powervirtualagents/dataverse-backed/authenticated/bots/{Copilot}/conversations/{ConversationId}/continue",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "ContinueExecuteDataverseCopilotOnAgenticRuntime": {
        "path": "/{connectionId}/copilotstudio/agenticruntime/dataverse-backed/authenticated/bots/{Copilot}/conversations/{ConversationId}/continue",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "ExecuteFirstPartyCopilot": {
        "path": "/{connectionId}/powervirtualagents/prebuilt/authenticated/bots/{Copilot}/conversations/{ConversationId}/execute/trigger/{TriggerId}",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "TriggerId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "ExecuteFirstPartyCopilotToStart": {
        "path": "/{connectionId}/powervirtualagents/prebuilt/authenticated/bots/{Copilot}/conversations/{ConversationId}",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "ContinueExecuteFirstPartyCopilot": {
        "path": "/{connectionId}/powervirtualagents/prebuilt/authenticated/bots/{Copilot}/conversations/{ConversationId}/continue",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "InvokeConnectorCallback": {
        "path": "/{connectionId}/powervirtualagents/bots/{Copilot}/channels/{channelId}/user-triggers/users/{userId}/triggers/{triggerId}",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "channelId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "triggerId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "conversationId",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "InvokeTriggerOnAgenticRuntime": {
        "path": "/{connectionId}/copilotstudio/agenticruntime/bots/{Copilot}/triggers/{triggerId}/invoke",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "triggerId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-cds-bot-id",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-workflow-resourcegroup-name",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-workflow-name",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-trigger-connection-mode",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-trigger-purpose",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-trigger-component-schema-name",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-trigger-component-version",
            "in": "header",
            "required": true,
            "type": "integer"
          },
          {
            "name": "x-ms-trigger-bot-version",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "inputs",
            "in": "body",
            "required": false,
            "type": "object"
          },
          {
            "name": "conversationId",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "x-ms-pva-bot-id",
            "in": "header",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "InvokeTrigger": {
        "path": "/{connectionId}/powervirtualagents/bots/{Copilot}/triggers/{triggerId}/invoke",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Copilot",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "triggerId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-cds-bot-id",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-workflow-resourcegroup-name",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-workflow-name",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-trigger-connection-mode",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-trigger-purpose",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-trigger-component-schema-name",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "x-ms-trigger-component-version",
            "in": "header",
            "required": true,
            "type": "integer"
          },
          {
            "name": "x-ms-trigger-bot-version",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "inputs",
            "in": "body",
            "required": false,
            "type": "object"
          },
          {
            "name": "conversationId",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "x-ms-pva-bot-id",
            "in": "header",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "EvaluationTestStartNewConversation": {
        "path": "/{connectionId}/powervirtualagents/evaluation-test/authenticated/bots/{CdsBotId}/conversations",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "CdsBotId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "EvaluationTestExecuteTurn": {
        "path": "/{connectionId}/powervirtualagents/evaluation-test/authenticated/bots/{CdsBotId}/conversations/{ConversationId}",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "CdsBotId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "EvaluationTestContinueTurn": {
        "path": "/{connectionId}/powervirtualagents/evaluation-test/authenticated/bots/{CdsBotId}/conversations/{ConversationId}/continue",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "CdsBotId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "EvaluationTestStartNewConversationOnAgenticRuntime": {
        "path": "/{connectionId}/copilotstudio/agenticruntime/evaluation-test/authenticated/bots/{CdsBotId}/conversations",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "CdsBotId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "EvaluationTestExecuteTurnOnAgenticRuntime": {
        "path": "/{connectionId}/copilotstudio/agenticruntime/evaluation-test/authenticated/bots/{CdsBotId}/conversations/{ConversationId}",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "CdsBotId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "EvaluationTestContinueTurnOnAgenticRuntime": {
        "path": "/{connectionId}/copilotstudio/agenticruntime/evaluation-test/authenticated/bots/{CdsBotId}/conversations/{ConversationId}/continue",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "CdsBotId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "DeclarativeAgentEvaluationTestStartNewConversation": {
        "path": "/{connectionId}/powervirtualagents/evaluation-test/authenticated/declarative-bots/{CdsBotId}/conversations",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "CdsBotId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "DeclarativeAgentEvaluationTestExecuteTurn": {
        "path": "/{connectionId}/powervirtualagents/evaluation-test/authenticated/declarative-bots/{CdsBotId}/conversations/{ConversationId}",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "CdsBotId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "ConversationId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "BindUserConnections": {
        "path": "/{connectionId}/powervirtualagents/bots/{botSchemaName}/channels/{channelId}/user-connections",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "botSchemaName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "channelId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "stateId",
            "in": "query",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "204": {
            "type": "void"
          }
        }
      },
      "RunAgentMakerEvaluationTestSet": {
        "path": "/{connectionId}/copilotstudio/bots/{Agent}/api/makerevaluation/testsets/{TestSetId}/run",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Agent",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "TestSetId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": false,
            "type": "object"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "202": {
            "type": "object"
          }
        }
      },
      "GetAgentMakerEvaluationTestSets": {
        "path": "/{connectionId}/copilotstudio/bots/{Agent}/api/makerevaluation/testsets",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Agent",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "GetAgentMakerEvaluationTestSetDetails": {
        "path": "/{connectionId}/copilotstudio/bots/{Agent}/api/makerevaluation/testsets/{TestSetId}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Agent",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "TestSetId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "GetAgentMakerEvaluationTestRuns": {
        "path": "/{connectionId}/copilotstudio/bots/{Agent}/api/makerevaluation/testruns",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Agent",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "GetAgentMakerEvaluationTestRunDetails": {
        "path": "/{connectionId}/copilotstudio/bots/{Agent}/api/makerevaluation/testruns/{EvaluationRunId}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Agent",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "EvaluationRunId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "environmentId",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      }
    }
  },
  "office365users": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "UpdateMyProfile": {
        "path": "/{connectionId}/codeless/v1.0/me",
        "method": "PATCH",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": false,
            "type": "object"
          }
        ],
        "responseInfo": {
          "default": {
            "type": "void"
          }
        }
      },
      "MyProfile_V2": {
        "path": "/{connectionId}/codeless/v1.0/me",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "$select",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "UpdateMyPhoto": {
        "path": "/{connectionId}/codeless/v1.0/me/photo/$value",
        "method": "PUT",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "Content-Type",
            "in": "header",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "default": {
            "type": "void"
          }
        }
      },
      "MyTrendingDocuments": {
        "path": "/{connectionId}/codeless/beta/me/insights/trending",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "$filter",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "extractSensitivityLabel",
            "in": "query",
            "required": false,
            "type": "boolean"
          },
          {
            "name": "fetchSensitivityLabelMetadata",
            "in": "query",
            "required": false,
            "type": "boolean"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "RelevantPeople": {
        "path": "/{connectionId}/users/{userId}/relevantpeople",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "MyProfile": {
        "path": "/{connectionId}/users/me",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "202": {
            "type": "void"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "UserProfile": {
        "path": "/{connectionId}/users/{userId}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "202": {
            "type": "void"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "UserPhotoMetadata": {
        "path": "/{connectionId}/users/photo",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userId",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "UserPhoto": {
        "path": "/{connectionId}/users/photo/value",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userId",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "string",
            "format": "binary"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "Manager": {
        "path": "/{connectionId}/users/{userId}/manager",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "202": {
            "type": "void"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "DirectReports": {
        "path": "/{connectionId}/users/{userId}/directReports",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "202": {
            "type": "void"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "SearchUser": {
        "path": "/{connectionId}/users",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "searchTerm",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "top",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "202": {
            "type": "void"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "SearchUserV2": {
        "path": "/{connectionId}/v2/users",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "searchTerm",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "top",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "isSearchTermRequired",
            "in": "query",
            "required": false,
            "type": "boolean"
          },
          {
            "name": "skipToken",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "202": {
            "type": "void"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "TestConnection": {
        "path": "/{connectionId}/testconnection",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "UserProfile_V2": {
        "path": "/{connectionId}/codeless/v1.0/users/{id}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "$select",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "Manager_V2": {
        "path": "/{connectionId}/codeless/v1.0/users/{id}/manager",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "$select",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "DirectReports_V2": {
        "path": "/{connectionId}/codeless/v1.0/users/{id}/directReports",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "$select",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "$top",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "UserPhoto_V2": {
        "path": "/{connectionId}/codeless/v1.0/users/{id}/photo/$value",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "string",
            "format": "binary"
          }
        }
      },
      "TrendingDocuments": {
        "path": "/{connectionId}/codeless/beta/users/{id}/insights/trending",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "id",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "$filter",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "extractSensitivityLabel",
            "in": "query",
            "required": false,
            "type": "boolean"
          },
          {
            "name": "fetchSensitivityLabelMetadata",
            "in": "query",
            "required": false,
            "type": "boolean"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "HttpRequest": {
        "path": "/{connectionId}/codeless/httprequest",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Uri",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "Method",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "Body",
            "in": "body",
            "required": false,
            "type": "object"
          },
          {
            "name": "ContentType",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader1",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader2",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader3",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader4",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader5",
            "in": "header",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "default": {
            "type": "void"
          }
        }
      }
    }
  }
};
