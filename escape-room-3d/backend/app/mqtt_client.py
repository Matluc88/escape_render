"""MQTT Client Singleton for ESP32 Communication"""
import asyncio
import aiomqtt
import os
from typing import Optional
from app.config import get_settings

class MQTTClient:
    """
    Singleton MQTT client for publishing game state to ESP32 devices.
    
    Uses aiomqtt (async MQTT library already in requirements.txt)
    """
    
    _instance: Optional['MQTTClient'] = None
    _client: Optional[aiomqtt.Client] = None
    
    @classmethod
    def _get_broker_config(cls):
        """Get broker configuration from settings"""
        settings = get_settings()
        return settings.mqtt_host, settings.mqtt_port
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    async def publish(cls, topic: str, payload: str, qos: int = 0):
        """
        Publish a message to MQTT broker.
        
        Args:
            topic: MQTT topic (e.g., "escape/game-completion/won")
            payload: Message payload (e.g., "true" or "false")
            qos: Quality of Service (0, 1, or 2)
        """
        try:
            # Get broker config from settings
            broker_host, broker_port = cls._get_broker_config()
            
            # Create temporary client for each publish (fire-and-forget pattern)
            async with aiomqtt.Client(broker_host, port=broker_port) as client:
                await client.publish(topic, payload, qos=qos)
                print(f"📤 [MQTT] Published to '{topic}' on {broker_host}:{broker_port}: {payload}")
        except Exception as e:
            print(f"⚠️ [MQTT] Failed to publish to '{topic}': {e}")
            # Non-blocking: continue even if MQTT fails
    
    @classmethod
    async def publish_game_won(cls, won: bool):
        """
        Publish game victory status to ESP32 devices.
        
        Args:
            won: True if game is won (all 4 rooms completed), False otherwise
        """
        payload = "true" if won else "false"
        await cls.publish("escape/game-completion/won", payload)
        print(f"🏆 [MQTT] Game won status published: {payload}")


# Convenience function for sync contexts (wraps async call)
def publish_game_won_sync(won: bool):
    """
    Synchronous wrapper for publishing game won status.
    
    Creates a new event loop if needed (for use in sync functions).
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If loop is already running, schedule as task
            asyncio.create_task(MQTTClient.publish_game_won(won))
        else:
            # Create new loop for this publish
            loop.run_until_complete(MQTTClient.publish_game_won(won))
    except Exception as e:
        print(f"⚠️ [MQTT] Error in sync publish: {e}")